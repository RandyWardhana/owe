// Kept out of the app's i18n dictionaries; words the app already owns come from
// lib/i18n so the two never name a control differently. Every stat is counted
// from lib/currency.ts and lib/i18n.

import type { LandingCopy, Preset } from "@/entities/props/landing";
import type { Lang } from "@/entities/settings";

export const PEOPLE = [
  { name: "Aya", swatch: 3 },
  { name: "Ben", swatch: 2 },
  { name: "Cleo", swatch: 1 },
  { name: "Dee", swatch: 5 },
];

/* Dish names stay as printed on the receipt in both languages; the preset's own
   name is in COPY. */
export const PRESETS: Preset[] = [
  {
    id: "ramen",
    place: "Ramen Ya",
    tax: 0.1,
    service: 0.05,
    items: [
      { name: "Tonkotsu ramen", price: 78000, start: [0] },
      { name: "Gyoza (6 pcs)", price: 45000, start: [0, 1] },
      { name: "Karaage", price: 52000, start: [1, 2] },
      { name: "Matcha latte", price: 38000, start: [2] },
      { name: "Mochi", qty: 4, price: 36000, start: [0, 1, 2, 3] },
    ],
  },
  {
    id: "lunch",
    place: "Warung Padang",
    tax: 0.1,
    service: 0,
    items: [
      { name: "Nasi rendang", price: 32000, start: [0] },
      { name: "Ayam pop", price: 28000, start: [1] },
      { name: "Gulai tunjang", price: 30000, start: [2] },
      { name: "Es teh manis", qty: 6, price: 30000, start: [0, 1, 2, 3], counts: [2, 1, 2, 1] },
      { name: "Kerupuk kulit", price: 9000, start: [] },
    ],
  },
  {
    id: "drinks",
    place: "The Tap Room",
    tax: 0.1,
    service: 0.07,
    items: [
      { name: "Draft beer", qty: 6, price: 270000, start: [0, 1, 3], counts: [3, 2, 1] },
      { name: "Mojito", price: 85000, start: [2] },
      { name: "Truffle fries", price: 55000, start: [] },
      { name: "Nachos", price: 70000, start: [] },
    ],
  },
];

export const COPY: Record<Lang, LandingCopy> = {
  en: {
    nav: { how: "How it works", try: "Try it", faq: "FAQ", open: "Open the app" },
    hero: {
      badges: ["Free", "No account", "Works offline"],
      title: ["Settle up,", "skip the drama."],
      lead: "Snap the bill, tap who had what, send one link. Tax and service follow every plate — your bill stays on your phone unless you share it.",
      primary: "Scan a receipt",
      secondary: "Try a split",
      activity: [
        { title: "Aya paid you Rp 115.575", meta: "GoPay · 2 min ago" },
        { title: "Ben opened your link", meta: "Ramen night · 3 items" },
        { title: "Receipt read", meta: "4 items · tax & service found" },
      ],
      chips: ["Who had the gyoza?", "Shared the mochi?"],
      stat: { eyebrow: "Split", value: "3 ways", sub: "Rp 288.650, settled" },
      rail: "Pay back with",
    },
    how: {
      eyebrow: "How it works",
      title: "Three steps, one split",
      step: "Step",
      steps: [
        {
          num: "01",
          title: "Scan or type",
          desc: "Point the camera at the bill and owe reads the items and prices. No signal? Type them in.",
          line: "The receipt does the typing.",
        },
        {
          num: "02",
          title: "Tap who had what",
          desc: "Add the table and tap faces onto dishes. A shared plate splits evenly; had two of the six teas? Count each. Tax and service follow either way.",
          line: "Shared gyoza is a split, not an argument.",
        },
        {
          num: "03",
          title: "Send one link",
          desc: "Everyone opens their share in the browser and copies your bank or e-wallet. No app, no sign-up.",
          line: "Nobody does maths at the table.",
        },
      ],
    },
    presets: { ramen: "Ramen night", lunch: "Office lunch", drinks: "Drinks round" },
    try: {
      eyebrow: "Have a go",
      title: "Tap who had what",
      lead: "This is the real maths, not a picture of it. Pick a bill, tap a face onto a dish, and on a line of several, count who had how many. Every share moves, tax and service included.",
      presetsLabel: "Start from a bill",
      cta: "Split my own bill",
      tapFace: "tap a face",
      allTheirs: "all theirs",
      nobodyYet: "nobody yet",
      shareAll: "Share everything",
      clear: "Clear",
      of: "of",
      assigned: "items assigned",
      subtotal: "Subtotal",
      total: "Total",
      tax: "Tax {n}%",
      service: "service {n}%",
      covered: "Every item is covered. This is what everyone gets sent.",
      orphansOne: "1 item has nobody on it — nobody is charged for it.",
      orphansMany: "{n} items have nobody on them — nobody is charged for them.",
      add: "Add {name} to {item}",
      remove: "Remove {name} from {item}",
    },
    perks: {
      eyebrow: "Why owe",
      title: "Built for the awkward part",
      lead: "From the first snap to the last “paid”, nothing in owe asks you to sign up, stay online, or trust it with your bills.",
      stats: [
        { value: "0", label: "Accounts needed" },
        { value: "13", label: "Currencies" },
        { value: "2", label: "Languages" },
      ],
      items: [
        { title: "No account, no sign-up", desc: "Open it and split. Your bills are saved on your own phone." },
        { title: "Works offline", desc: "Splitting and settling need no signal — only reading a photo does." },
        { title: "Encrypted links", desc: "Backups and shared links are encrypted end to end." },
        { title: "Get paid back", desc: "Add a bank or e-wallet once; everyone copies it from the link." },
      ],
    },
    banner: {
      title: "Their share, in their browser",
      lead: "Send one link. Everyone sees what they had, what they owe and where to pay — no app, no sign-up.",
      button: "Open owe",
      phoneTitle: "Ramen night",
      copy: "Copy",
    },
    faqHead: { eyebrow: "Good to know", title: "Questions, answered" },
    faqs: [
      {
        q: "Do I need an account?",
        a: "No. owe works the moment you open it — no sign-up, no login. Your bills are saved right on your device.",
      },
      {
        q: "Does it work offline?",
        a: "Yes. Splitting and settling work fully offline. You only need a connection to read a photo of a receipt or to share a link.",
      },
      {
        q: "Is my data private?",
        a: "Your bills never leave your phone unless you choose to share them. Backups and shared links are encrypted end to end. owe does count anonymous usage — which screens get opened and which buttons get tapped — but never what is on a bill: no items, names, amounts or payment details.",
      },
      {
        q: "How do people pay me back?",
        a: "Add your bank account or an e-wallet — GoPay, OVO, DANA, ShopeePay and more. It shows up on the shared settle-up page so anyone can copy it.",
      },
      {
        q: "Can I split one item between people?",
        a: "Yes. Put as many people on an item as you like and owe divides it evenly, including its share of tax and service. If someone had more than one, switch the line to Count each.",
      },
      {
        q: "Do the people I split with need the app?",
        a: "No. They just open the link you send — the totals and payment details work in any browser, no install needed.",
      },
      {
        q: "How much does it cost?",
        a: "owe is free to use.",
      },
    ],
    final: {
      title: ["Got the bill", "in front of you?"],
      lead: "Snap it, tap it, send the link before dessert.",
      button: "Open owe",
      install: "Add it to your home screen — it runs like an app, offline.",
    },
    footer: { tag: "scan · split · settle", fine: "Free · No account · Works offline" },
  },

  id: {
    nav: { how: "Cara kerja", try: "Coba", faq: "FAQ", open: "Buka aplikasi" },
    hero: {
      badges: ["Gratis", "Tanpa akun", "Bisa offline"],
      title: ["Beresin,", "tanpa drama."],
      lead: "Foto struknya, ketuk siapa pesan apa, kirim satu link. Pajak dan service ikut tiap menu — tagihanmu nggak keluar dari HP-mu kecuali kamu bagikan.",
      primary: "Scan struk",
      secondary: "Coba bagi",
      activity: [
        { title: "Aya bayar kamu Rp 115.575", meta: "GoPay · 2 mnt lalu" },
        { title: "Ben buka link-mu", meta: "Malam ramen · 3 item" },
        { title: "Struk terbaca", meta: "4 item · pajak & service ketemu" },
      ],
      chips: ["Siapa pesan gyoza?", "Mochi dibagi rata?"],
      stat: { eyebrow: "Dibagi", value: "3 orang", sub: "Rp 288.650, lunas" },
      rail: "Dibayar lewat",
    },
    how: {
      eyebrow: "Cara kerja",
      title: "Tiga langkah, satu patungan",
      step: "Langkah",
      steps: [
        {
          num: "01",
          title: "Scan atau ketik",
          desc: "Arahkan kamera ke struk, owe baca item dan harganya. Nggak ada sinyal? Ketik aja.",
          line: "Struknya yang ngetik.",
        },
        {
          num: "02",
          title: "Ketuk siapa pesan apa",
          desc: "Masukin yang ikut makan, lalu ketuk wajahnya ke tiap menu. Menu sharing dibagi rata; ada yang minum dua dari enam es teh? Hitung per orang. Pajak dan service ikut otomatis.",
          line: "Gyoza sharing itu dibagi, bukan diributin.",
        },
        {
          num: "03",
          title: "Kirim satu link",
          desc: "Semua buka bagiannya di browser dan salin rekening atau e-wallet kamu. Tanpa aplikasi, tanpa daftar.",
          line: "Nggak ada yang ngitung di meja.",
        },
      ],
    },
    presets: { ramen: "Malam ramen", lunch: "Makan siang kantor", drinks: "Ronde minum" },
    try: {
      eyebrow: "Coba dulu",
      title: "Ketuk siapa pesan apa",
      lead: "Ini hitungan aslinya, bukan gambar. Pilih tagihan, ketuk wajah ke menu, dan di baris yang isinya banyak, hitung siapa ambil berapa. Semua bagian langsung berubah, pajak dan service ikut.",
      presetsLabel: "Mulai dari tagihan",
      cta: "Bagi tagihanku sendiri",
      tapFace: "ketuk wajah",
      allTheirs: "punya dia semua",
      nobodyYet: "belum ada",
      shareAll: "Bagi ke semua",
      clear: "Kosongkan",
      of: "dari",
      assigned: "item terbagi",
      subtotal: "Subtotal",
      total: "Total",
      tax: "Pajak {n}%",
      service: "service {n}%",
      covered: "Semua item sudah ada yang punya. Ini yang dikirim ke semua.",
      orphansOne: "1 item belum ada yang punya — nggak ada yang ditagih untuk itu.",
      orphansMany: "{n} item belum ada yang punya — nggak ada yang ditagih untuk itu.",
      add: "Tambahkan {name} ke {item}",
      remove: "Hapus {name} dari {item}",
    },
    perks: {
      eyebrow: "Kenapa owe",
      title: "Dibuat buat bagian yang canggung",
      lead: "Dari foto pertama sampai “lunas” terakhir, owe nggak pernah minta kamu daftar, online terus, atau nitip tagihanmu ke server.",
      stats: [
        { value: "0", label: "Akun dibutuhkan" },
        { value: "13", label: "Mata uang" },
        { value: "2", label: "Bahasa" },
      ],
      items: [
        { title: "Tanpa akun, tanpa daftar", desc: "Buka, langsung bagi. Tagihanmu tersimpan di HP-mu sendiri." },
        { title: "Bisa offline", desc: "Bagi dan lunasi nggak butuh sinyal — cuma baca foto struk yang perlu." },
        { title: "Link terenkripsi", desc: "Cadangan dan link yang dibagikan terenkripsi end-to-end." },
        { title: "Dibayar balik", desc: "Tambahkan rekening atau e-wallet sekali; semua tinggal salin dari link." },
      ],
    },
    banner: {
      title: "Bagiannya, langsung di browser mereka",
      lead: "Kirim satu link. Semua lihat apa yang mereka pesan, berapa yang harus dibayar, dan ke mana — tanpa aplikasi, tanpa daftar.",
      button: "Buka owe",
      phoneTitle: "Malam ramen",
      copy: "Salin",
    },
    faqHead: { eyebrow: "Perlu tahu", title: "Yang sering ditanya" },
    faqs: [
      {
        q: "Perlu bikin akun?",
        a: "Nggak. owe langsung bisa dipakai — tanpa daftar, tanpa login. Tagihanmu tersimpan di perangkatmu sendiri.",
      },
      {
        q: "Bisa dipakai offline?",
        a: "Bisa. Bagi dan lunasi jalan sepenuhnya tanpa internet. Koneksi cuma perlu buat membaca foto struk atau membagikan link.",
      },
      {
        q: "Dataku aman?",
        a: "Tagihanmu nggak pernah keluar dari HP kecuali kamu sendiri yang membagikannya. Cadangan dan link yang dibagikan terenkripsi end-to-end. owe memang menghitung pemakaian secara anonim — layar mana yang dibuka dan tombol mana yang ditekan — tapi nggak pernah isi tagihannya: nggak ada item, nama, nominal, atau detail pembayaran.",
      },
      {
        q: "Gimana orang bayar balik ke aku?",
        a: "Tambahkan rekening bank atau e-wallet — GoPay, OVO, DANA, ShopeePay, dan lainnya. Muncul di halaman pelunasan yang dibagikan, jadi siapa pun bisa menyalinnya.",
      },
      {
        q: "Bisa satu menu dibagi beberapa orang?",
        a: "Bisa. Pasang satu menu ke sebanyak apa pun orang dan owe membaginya rata, termasuk bagian pajak dan service-nya. Kalau ada yang ambil lebih dari satu, ganti barisnya ke Hitung per orang.",
      },
      {
        q: "Teman yang ikut patungan perlu install aplikasinya?",
        a: "Nggak. Mereka cukup buka link yang kamu kirim — total dan detail pembayarannya bisa dibuka di browser apa saja, tanpa install.",
      },
      {
        q: "Bayar berapa?",
        a: "owe gratis.",
      },
    ],
    final: {
      title: ["Struknya udah", "di depan mata?"],
      lead: "Foto, ketuk, kirim link-nya sebelum dessert datang.",
      button: "Buka owe",
      install: "Tambahkan ke layar utama — jalan kayak aplikasi, bisa offline.",
    },
    footer: { tag: "scan · bagi · lunas", fine: "Gratis · Tanpa akun · Bisa offline" },
  },
};
