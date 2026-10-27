import type { Receipt } from "@/lib/receipt"
import { formatDateTime } from "@/lib/format"
import { STORE_CONFIG } from "@/config/store"

// Bluetooth GATT UUIDs for thermal printer
export const PRINTER_SERVICE = "000018f0-0000-1000-8000-00805f9b34fb"
export const PRINTER_CHARACTERISTIC = "00002af1-0000-1000-8000-00805f9b34fb"

// ESC/POS commands
const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

const CMD = {
  INIT: [ESC, 0x40],
  CENTER: [ESC, 0x61, 1],
  LEFT: [ESC, 0x61, 0],
  BOLD_ON: [ESC, 0x45, 1],
  BOLD_OFF: [ESC, 0x45, 0],
  DOUBLE_ON: [GS, 0x21, 0x11],
  FONT_B: [ESC, 0x4d, 1],
  FONT_A: [ESC, 0x4d, 0],
  CUT: [GS, 0x56, 0x00],
  // Hard-reset ukuran/emphasis. Sebagian printer murah tidak menanggapi
  // GS ! 0x00 dengan bersih, sehingga pembesaran header "bocor" ke body dan
  // membuat teks melebar + membungkus. ESC ! 0 = Font A, tanpa bold/double.
  NORMAL: [ESC, 0x21, 0x00],
  // ESC SP 0 = hilangkan spasi antar-karakter (cegah huruf jadi berjarak).
  NO_CHAR_SPACING: [ESC, 0x20, 0x00],
  // Feed 5 baris di akhir: printer tanpa auto-cutter butuh dorongan ekstra
  // agar footer keluar melewati bibir sobek, jadi bisa disobek rapi.
  FEED_END: [ESC, 0x64, 5],
}

const LINE_WIDTH = 32 // 58mm printer (CBT-58ii, Font A = 32 chars/line)

// Identitas toko — sengaja disamakan dengan tampilan on-screen di
// components/kasir/receipt-view.tsx supaya struk cetak & preview identik.
const STORE_NAME = (STORE_CONFIG.name || "OpenPOS Café").toUpperCase()
const STORE_ADDRESS = STORE_CONFIG.address
const STORE_PHONE = `Contact: ${STORE_CONFIG.phone}`

function encode(text: string): number[] {
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // Normalkan spasi unicode (non-breaking / narrow) ke spasi biasa, jika
    // tidak akan jadi "?" (mis. dari Intl currency/date). Sisanya di luar ASCII
    // diganti "?" karena printer hanya mendukung code page dasar.
    if (code === 0x00a0 || code === 0x202f || code === 0x2009) {
      result.push(0x20)
    } else {
      result.push(code > 127 ? 0x3f : code)
    }
  }
  return result
}

// Ratakan label kiri + nilai kanan dalam satu baris `width` karakter.
// Anti-overflow: bila tidak muat, `left` dipotong supaya `right` (harga/total)
// selalu utuh & rata kanan — tidak ada baris kepanjangan yang membungkus.
function padRow(left: string, right: string, width = LINE_WIDTH): string {
  const maxLeft = Math.max(0, width - right.length - 1)
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left
  const gap = width - l.length - right.length
  return l + " ".repeat(Math.max(1, gap)) + right
}

// Bungkus teks panjang (alamat, nama item, catatan) per kata ke lebar `width`.
function wrapText(text: string, width = LINE_WIDTH): string[] {
  const lines: string[] = []
  let cur = ""
  for (let w of text.split(/\s+/).filter(Boolean)) {
    // Satu kata yang lebih panjang dari lebar: potong keras per `width`.
    while (w.length > width) {
      if (cur) { lines.push(cur); cur = "" }
      lines.push(w.slice(0, width))
      w = w.slice(width)
    }
    if (!cur) {
      cur = w
    } else if (cur.length + 1 + w.length <= width) {
      cur += ` ${w}`
    } else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function separator(char = "-", width = LINE_WIDTH): string {
  return char.repeat(width)
}

function fmtRp(n: number): string {
  return "Rp" + n.toLocaleString("id-ID")
}

function buildBytes(...parts: (number | number[])[]): Uint8Array {
  const flat: number[] = []
  for (const p of parts) {
    if (Array.isArray(p)) flat.push(...p)
    else flat.push(p)
  }
  return new Uint8Array(flat)
}

export function buildEscPosReceipt(data: Receipt): Uint8Array {
  const lines: (number | number[])[] = []

  const add = (...cmds: (number | number[])[]) => lines.push(...cmds)
  const text = (s: string) => add(encode(s), [LF])
  const textLines = (s: string) => {
    for (const l of wrapText(s)) text(l)
  }
  // Baris info order: label kiri + nilai rata kanan bila muat satu baris.
  // Kalau nilainya kepanjangan (mis. kasir "Pembelian diluar jam operasional"),
  // cetak label lalu nilai rata KIRI penuh (wrap) — supaya tidak menjorok ke
  // kanan / terpotong ke baris bawah.
  const infoRow = (label: string, value: string) => {
    if (label.length + 1 + value.length <= LINE_WIDTH) {
      text(padRow(label, value))
    } else {
      text(label)
      textLines(value)
    }
  }

  add(CMD.INIT, CMD.NORMAL, CMD.NO_CHAR_SPACING)

  // ── Header ──────────────────────────────────────────────
  add(CMD.CENTER, CMD.BOLD_ON, CMD.DOUBLE_ON)
  text(STORE_NAME)
  add(CMD.NORMAL) // hard-reset ukuran setelah header membesar (cegah bocor ke body)
  add(CMD.FONT_B)
  textLines(STORE_ADDRESS)
  text(STORE_PHONE)
  add(CMD.FONT_A)
  text(separator())

  // ── Info order ──────────────────────────────────────────
  add(CMD.LEFT)
  infoRow("No. Order", data.orderRef)
  infoRow("Waktu", formatDateTime(data.createdAt))
  infoRow("Kasir", data.cashier)
  infoRow("Pemesan", data.customerName)
  infoRow(
    "Posisi",
    data.orderType === "DINE_IN"
      ? `Lantai ${data.tableNumber ?? "-"}`
      : "Bawa Pulang",
  )
  text(separator())

  // ── Item ────────────────────────────────────────────────
  for (const item of data.items) {
    textLines(item.name)
    text(padRow(`  ${item.qty} x ${fmtRp(item.price)}`, fmtRp(item.subtotal)))
  }

  // ── Catatan (opsional) ──────────────────────────────────
  if (data.note) {
    text(separator())
    text("Catatan:")
    textLines(`"${data.note}"`)
  }
  text(separator())

  // ── Total & pembayaran ──────────────────────────────────
  if (data.discount > 0) {
    text(padRow("Subtotal", fmtRp(data.subtotal)))
    text(padRow("Diskon", "-" + fmtRp(data.discount)))
  }
  add(CMD.BOLD_ON)
  text(padRow("TOTAL", fmtRp(data.total)))
  add(CMD.BOLD_OFF)

  const methodLabel =
    data.paymentMethod === "TUNAI"
      ? "Tunai"
      : data.paymentMethod === "QRIS"
        ? "QRIS"
        : "Transfer"
  text(padRow(methodLabel, fmtRp(data.amountPaid || 0)))
  if (data.paymentMethod === "TUNAI") {
    text(padRow("Kembalian", fmtRp(data.change || 0)))
  }
  text(separator())

  // ── Footer ──────────────────────────────────────────────
  // Font B (lebih kecil, ~42 char/baris) supaya kalimat sapaan 33 karakter
  // muat dalam SATU baris — di Font A (32 char) tanda "!"/"s" terakhir
  // membungkus ke bawah. Sekaligus mirip footer kecil di preview.
  add(CMD.CENTER, CMD.FONT_B)
  text(`Password WiFi: ${STORE_CONFIG.wifiPassword}`)
  text(STORE_CONFIG.receiptFooter)
  text(`Sampai jumpa lagi di ${STORE_CONFIG.shortName}`)
  add(CMD.FONT_A)
  add(CMD.FEED_END, CMD.CUT)

  return buildBytes(...lines)
}
