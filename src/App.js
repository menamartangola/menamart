import React, { useState, useMemo, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNin75h_Ywke6TWsxUr47hv5YmEGrFhQc",
  authDomain: "menamart-c3f00.firebaseapp.com",
  projectId: "menamart-c3f00",
  storageBucket: "menamart-c3f00.firebasestorage.app",
  messagingSenderId: "437200006293",
  appId: "1:437200006293:web:1b7067a6a36b248ad8bf9c"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const col = name => collection(db, name);
const delDoc  = (colName, id) => deleteDoc(doc(db, colName, String(id)));
const updDoc  = (colName, id, data) => updateDoc(doc(db, colName, String(id)), data);

const WA_NUMBER   = "244933929233";
const MOV         = 200_000;
const APP_VERSION = "5.0.0";
const MAX_FAILED_ATTEMPTS = 3;
const CREDIT_METHODS = ["credit_week", "credit_month"];
const GMAIL_NOTIFY = "menamart.angola@gmail.com";

const fmt = n => "AKZ " + new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 0 }).format(Math.round(n));
const waLink = (msg, phone = WA_NUMBER) => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const notifyWA = (msg) => window.open(waLink(msg, WA_NUMBER), "_blank");

// FIX #6: Gmail notification via mailto
const sendGmailNotification = (order) => {
  const pm = PAYMENT_METHODS.find(m => m.id === order.paymentMethod);
  const subject = encodeURIComponent(`🛒 Nova Encomenda ${order.id} — ${order.clientName}`);
  const body = encodeURIComponent(
    `━━━━━━━━━━━━━━━━━━━━━━━━━\nNOVA ENCOMENDA MENAMART\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `ID: ${order.id}\nCliente: ${order.clientName} (${order.clientCode})\n` +
    `Total: ${fmt(order.total)}\nPagamento: ${pm?.label || order.paymentMethod}\n` +
    `Entrega: ${order.address}\nData: ${order.date}\n\n` +
    `PRODUTOS:\n${(order.items||[]).map(i=>`  • ${i.name} x${i.qty} = ${fmt(i.price*i.qty)}`).join("\n")}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\nMenamart Angola`
  );
  window.open(`mailto:${GMAIL_NOTIFY}?subject=${subject}&body=${body}`, "_blank");
};

const STATUS_COLORS = { Pending:"#F59E0B", Confirmed:"#3B82F6", "Out for Delivery":"#8B5CF6", Delivered:"#16A34A", Cancelled:"#DC2626" };
const STATUS_FLOW   = ["Pending","Confirmed","Out for Delivery","Delivered","Cancelled"];

const PAYMENT_METHODS = [
  { id:"prepaid",       label:"Pré-pago",       icon:"💳", desc:"Antes da entrega" },
  { id:"on_delivery",   label:"Contra Entrega",  icon:"🚚", desc:"Na entrega" },
  { id:"bank_transfer", label:"Transferência",   icon:"🏦", desc:"Transferência bancária" },
  { id:"multicaixa",    label:"Multicaixa",      icon:"📱", desc:"Multicaixa Express" },
  { id:"credit_week",   label:"Crédito 7 dias",  icon:"📅", desc:"Pagar em 7 dias" },
  { id:"credit_month",  label:"Crédito 30 dias", icon:"🗓️", desc:"Pagar em 30 dias" },
];

const LOGO_SRC = "https://i.ibb.co/wNS8LtMn/logo.png";

const SEED_PRODUCTS = [
  { id:"p1",  name:"Arroz Carolino",      sub:"Saco 25kg",     category:"Arroz",       costPrice:8500,  sellingPrice:12500, stock:true, img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80", desc:"Arroz carolino de grão longo, ideal para hotelaria e restauração. Grão firme após cozedura." },
  { id:"p2",  name:"Frango Inteiro",      sub:"Por kg",        category:"Carnes",      costPrice:5500,  sellingPrice:9000,  stock:true, img:"https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80", desc:"Frango fresco inteiro certificado, entregue em caixa refrigerada." },
  { id:"p3",  name:"Tomate Fresco",       sub:"Caixa 10kg",    category:"Legumes",     costPrice:2800,  sellingPrice:4500,  stock:true, img:"https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&q=80", desc:"Tomate fresco de calibre uniforme, ideal para restauração." },
  { id:"p4",  name:"Farinha Premium",     sub:"Saco 50kg",     category:"Farinhas",    costPrice:11000, sellingPrice:15000, stock:true, img:"https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80", desc:"Farinha de trigo tipo 55, ideal para panificação e pastelaria profissional." },
  { id:"p5",  name:"Batata Branca",       sub:"Saco 25kg",     category:"Legumes",     costPrice:3500,  sellingPrice:5800,  stock:true, img:"https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80", desc:"Batata branca de qualidade superior, saco 25kg." },
  { id:"p6",  name:"Salmão Atlântico",    sub:"Caixa 5kg",     category:"Peixe",       costPrice:15000, sellingPrice:22000, stock:true, img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80", desc:"Salmão atlântico fresco, caixa 5kg refrigerada." },
  { id:"p7",  name:"Bife Premium",        sub:"Caixa 10kg",    category:"Carnes",      costPrice:13000, sellingPrice:18500, stock:true, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80", desc:"Bife premium de qualidade superior, caixa 10kg." },
  { id:"p8",  name:"Azeite Extra Virgin", sub:"Lata 5L",       category:"Oleos",       costPrice:10500, sellingPrice:16000, stock:true, img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80", desc:"Azeite extra virgem importado, lata 5L." },
  { id:"p9",  name:"Sal Marinho",         sub:"Balde 10kg",    category:"Condimentos", costPrice:2800,  sellingPrice:7300,  stock:true, img:"https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=80", desc:"Sal marinho refinado, balde 10kg." },
  { id:"p10", name:"Café Moído",          sub:"Caixa 10x500g", category:"Bebidas",     costPrice:24000, sellingPrice:36000, stock:true, img:"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80", desc:"Café moído premium, caixa com 10 pacotes de 500g." },
  { id:"p11", name:"Feijão Frade",        sub:"Saco 25kg",     category:"Leguminosas", costPrice:12000, sellingPrice:18500, stock:true, img:"https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80", desc:"Feijão frade seco, saco 25kg." },
  { id:"p12", name:"Oleo de Girassol",    sub:"Bidon 20L",     category:"Oleos",       costPrice:16000, sellingPrice:22000, stock:true, img:"https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400&q=80", desc:"Óleo de girassol refinado, bidão 20L." },
];
const SEED_CATEGORIES = [
  { id:"c1", name:"Arroz" }, { id:"c2", name:"Carnes" }, { id:"c3", name:"Legumes" },
  { id:"c4", name:"Peixe" }, { id:"c5", name:"Farinhas" }, { id:"c6", name:"Condimentos" },
  { id:"c7", name:"Oleos" }, { id:"c8", name:"Leguminosas" }, { id:"c9", name:"Bebidas" },
];
const SEED_PARTNERS = [
  { id:"pa1", name:"Fazenda Angola", type:"Produtor", logo:"https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&q=80", desc:"Arroz e cereais" },
  { id:"pa2", name:"Frigorífico Luanda", type:"Frigorífico", logo:"https://images.unsplash.com/photo-1558030006-450675393462?w=200&q=80", desc:"Carnes frescas" },
  { id:"pa3", name:"Pesca Atlântico", type:"Peixe", logo:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&q=80", desc:"Peixe e marisco" },
];
const DEFAULT_SETTINGS = {
  banks: [{ id:"b1", bankName:"Banco BFA", accountName:"Menamart Lda", iban:"AO06.0040.0000.0000.0000.1019.6" }],
  defaultMethod:"on_delivery",
  acceptedMethods:["prepaid","on_delivery","bank_transfer","multicaixa","credit_week","credit_month"],
  multicaixaRef:"933 929 233",
  creditClients:[],
  adminPassword:"menamart2026",
};

function useFirestoreCollection(colName) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(col(colName), snap => {
      setData(snap.docs.map(d => ({ ...d.data(), _id: d.id })));
      setLoading(false);
    }, err => { console.error(colName, err); setLoading(false); });
    return unsub;
  }, [colName]);
  return [data, loading];
}


// =============================================================================
// STYLES — v5 with all 7 improvements
// =============================================================================
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
/* FIX #4: Mobile overflow fix */
html,body{overflow-x:hidden;max-width:100vw}
:root{
  --green:#1B6B1B;--green-dark:#0f430f;--green-mid:#256625;--green-light:#38a838;
  --green-pale:#edf7ed;--green-pale2:#c2e0c2;--orange:#E8580A;--orange-dark:#bc420a;
  --orange-pale:#fff0e8;--white:#fff;--off-white:#ffffff;
  --gray:#eff2ef;--border:#e0eae0;--ink:#0c1a0c;--ink-soft:#2b422b;--ink-muted:#6b8a6b;
  --shadow-sm:0 1px 6px rgba(0,0,0,.06);--shadow:0 4px 20px rgba(0,0,0,.08);
  --shadow-lg:0 8px 40px rgba(0,0,0,.12);--shadow-xl:0 20px 60px rgba(0,0,0,.18);
  --radius:14px;--radius-sm:9px;
  --font-display:'Inter',sans-serif;
  --font-body:'Inter',sans-serif;
}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);background:var(--off-white);color:var(--ink);-webkit-font-smoothing:antialiased}

/* FIX #7: Amazon-style navbar */
.nav{position:sticky;top:0;z-index:200;background:#0c1a0c;border-bottom:1px solid rgba(255,255,255,.06);box-shadow:0 2px 16px rgba(0,0,0,.25)}
.nav-top{height:62px;padding:0 20px;display:flex;align-items:center;gap:12px}
.nav-search-row{display:none;padding:8px 12px;background:#0c1a0c;border-top:1px solid rgba(255,255,255,.06)}
.nav-search-row-inner{display:flex;background:#fff;border-radius:4px;overflow:hidden;border:2px solid #EF9F27;width:100%}
.nav-search-row-inner input{flex:1;padding:11px 16px;border:none;background:#fff;font-size:15px;color:#0c1a0c;outline:none}
.nav-search-row-inner input::placeholder{color:#999}
.nav-search-row-inner button{background:#EF9F27;border:none;padding:0 22px;cursor:pointer;font-size:18px;color:#fff}
.nav-search-row-inner button:hover{background:#cc8800}
@media(max-width:860px){.nav-top{height:auto;padding:8px 12px}.nav-search{display:none!important}.nav-search-row{display:block}}
.nav-logo{display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;text-decoration:none}
.nav-logo img{height:38px;width:auto;object-fit:contain}
.nav-brand{font-family:var(--font-display);font-size:24px;letter-spacing:-.02em;font-weight:800}
.nav-brand-mena{color:#7dd87d}.nav-brand-mart{color:#ff8040}
/* FIX #7: Center search bar */
.nav-search{flex:1;max-width:800px;margin:0 auto;display:flex;background:#fff;border-radius:4px;overflow:hidden;border:2px solid #EF9F27;transition:border-color .18s}
@media(max-width:860px){.nav-search{order:3;flex:0 0 100%;margin:0 0 8px 0;max-width:100%}.nav-top{flex-wrap:wrap}}.nav-search:focus-within{border-color:rgba(125,216,125,.5)}
.nav-search input{flex:1;padding:10px 16px;border:none;background:#fff;font-family:var(--font-body);font-size:15px;color:#0c1a0c;outline:none}
.nav-search input::placeholder{color:#999}
.nav-search-btn{background:#EF9F27;border:none;padding:0 22px;cursor:pointer;font-size:18px;color:#fff;transition:background .18s}
.nav-search-btn:hover{background:#cc8800}
.nav-right{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto}
.cart-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--green);color:#fff;border:none;border-radius:8px;font-family:var(--font-body);font-weight:700;font-size:13px;cursor:pointer;transition:all .2s;white-space:nowrap}
.cart-btn:hover{background:var(--green-light)}
.cart-count{background:var(--orange);color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}
.user-pill{font-family:var(--font-body);font-size:12px;font-weight:600;color:#7dd87d;background:rgba(125,216,125,.08);border:1px solid rgba(125,216,125,.2);border-radius:7px;padding:6px 12px;cursor:pointer;transition:all .2s;white-space:nowrap}
.user-pill:hover{background:rgba(125,216,125,.15)}
.btn-outline-nav{padding:7px 14px;border:1px solid rgba(255,255,255,.25);border-radius:7px;font-family:var(--font-body);font-weight:600;font-size:13px;cursor:pointer;background:none;color:rgba(255,255,255,.75);transition:all .2s;white-space:nowrap}
.btn-outline-nav:hover{border-color:rgba(125,216,125,.5);color:#7dd87d}

/* FIX #7: Welcome bar */
.welcome-bar{background:#112211;padding:8px 20px;border-bottom:1px solid rgba(255,255,255,.06)}
.welcome-text{font-family:var(--font-display);font-size:14px;font-weight:600;color:#9fe89f;text-align:center;letter-spacing:-.01em}

.hero-wrap{background:#0c1a0c;padding:64px 24px 52px;text-align:center;position:relative;overflow:hidden}
.hero-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(125,216,125,.1);border:1px solid rgba(125,216,125,.2);border-radius:100px;padding:5px 16px;font-family:var(--font-body);font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#7dd87d;margin-bottom:20px}
.hero-badge::before{content:'';width:5px;height:5px;border-radius:50%;background:#ff8040;animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
.hero-title{font-family:var(--font-display);font-size:clamp(28px,5vw,54px);color:#fff;font-weight:800;line-height:1.1;margin-bottom:16px;letter-spacing:-.03em}
.hero-title em{font-style:italic;color:#a8e6a8;font-weight:400}
.hero-sub{font-size:15px;color:rgba(255,255,255,.48);max-width:480px;margin:0 auto 36px;line-height:1.75;font-weight:300}
.hero-cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

.steps-section{background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:64px 24px}
.step-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px}
.step-card{background:var(--off-white);border:1.5px solid var(--border);border-radius:16px;padding:24px 20px;transition:all .25s}
.step-card:hover{transform:translateY(-3px);box-shadow:var(--shadow);border-color:var(--green-pale2);background:#fff}
.step-num{width:34px;height:34px;border-radius:9px;background:var(--orange);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;margin-bottom:12px;font-weight:800}
.step-icon{font-size:22px;margin-bottom:7px}
.step-title{font-family:var(--font-display);font-size:16px;color:var(--ink);margin-bottom:6px;font-weight:700}
.step-desc{font-size:13px;color:var(--ink-muted);line-height:1.7;font-weight:300}

.btn-primary{display:inline-flex;align-items:center;gap:9px;padding:13px 26px;background:var(--orange);color:#fff;border:none;border-radius:10px;font-family:var(--font-body);font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;text-decoration:none;box-shadow:0 3px 16px rgba(232,88,10,.3)}
.btn-primary:hover{background:var(--orange-dark);transform:translateY(-1px)}
.btn-ghost{display:inline-flex;align-items:center;gap:9px;padding:13px 26px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.18);border-radius:10px;font-family:var(--font-body);font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;text-decoration:none}
.btn-ghost:hover{background:rgba(255,255,255,.13)}
.btn-green{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:var(--green);color:#fff;border:none;border-radius:9px;font-family:var(--font-body);font-weight:700;font-size:13px;cursor:pointer;transition:all .18s}
.btn-green:hover{background:var(--green-light)}
.btn-sm{padding:5px 10px;border-radius:6px;font-family:var(--font-body);font-weight:600;font-size:12px;cursor:pointer;border:none;transition:all .15s}
.btn-gray{background:var(--gray);color:var(--ink-soft);border:1px solid var(--border)}
.btn-gray:hover{border-color:var(--green-light);color:var(--green)}
.btn-red{background:#FEE2E2;color:#DC2626;border:1px solid #FCA5A5}
.btn-red:hover{background:#DC2626;color:#fff}
.btn-wa{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:12px;background:#25D366;color:#fff;border:none;border-radius:9px;font-family:var(--font-body);font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;transition:all .18s}
.btn-wa:hover{background:#1da855}
.btn-outline{padding:8px 15px;border:1px solid var(--border);border-radius:8px;font-family:var(--font-body);font-weight:600;font-size:13px;cursor:pointer;background:#fff;color:var(--ink-soft);transition:all .15s}
.btn-outline:hover{border-color:var(--green);color:var(--green)}

.section{padding:44px 24px;max-width:1200px;margin:0 auto;width:100%}
.section-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:18px}
.section-title{font-family:var(--font-display);font-size:24px;font-weight:700;letter-spacing:-.02em}
.eyebrow{font-family:var(--font-body);font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--orange);margin-bottom:9px;text-align:center}
.card{background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);border:1px solid var(--border);margin-bottom:18px}
.card-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--off-white)}
.card-title{font-family:var(--font-display);font-size:17px;font-weight:700}
.info-box{background:var(--green-pale);border:1px solid var(--green-pale2);border-left:3px solid var(--green-light);border-radius:var(--radius-sm);padding:13px 16px;font-size:13px;color:var(--ink-soft);line-height:1.7}
.credit-box{background:#faf5ff;border:1px solid #e9d5ff;border-left:3px solid #7c3aed;border-radius:var(--radius-sm);padding:13px 16px;font-size:13px;color:#4c1d95;line-height:1.7;margin-top:8px}

/* FIX #5: Guest price hide */
.price-hidden{display:inline-flex;align-items:center;gap:5px;background:var(--orange-pale);border:1px solid #fcd9bc;border-radius:100px;padding:3px 10px;font-size:11px;font-weight:700;color:var(--orange-dark);cursor:pointer}
.price-hidden:hover{background:#fde8d5}

.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
.cat-card{border-radius:10px;overflow:hidden;cursor:pointer;box-shadow:var(--shadow-sm);transition:all .22s;background:#fff;border:1px solid var(--border)}
.cat-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.cat-card-label{padding:7px 8px;font-family:var(--font-body);font-weight:700;font-size:12px;color:var(--ink);text-align:center}

.prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.prod-card{background:#fff;border-radius:12px;box-shadow:var(--shadow-sm);overflow:hidden;display:flex;flex-direction:column;transition:all .22s;border:1px solid var(--border)}
.prod-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.prod-card.out-of-stock{opacity:.6}
.prod-img{position:relative;height:130px;overflow:hidden;background:var(--gray);cursor:pointer}
.prod-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s}
.prod-card:hover .prod-img img{transform:scale(1.05)}
.oos-badge{position:absolute;top:8px;right:0;background:#DC2626;color:#fff;font-size:9px;font-weight:700;padding:3px 9px 3px 7px;border-radius:4px 0 0 4px;letter-spacing:.05em}

/* FIX #2: Quick view button overlay */
.quick-view-overlay{position:absolute;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .22s;cursor:pointer}
.prod-img:hover .quick-view-overlay{opacity:1}
.quick-view-btn{background:#fff;color:var(--ink);border:none;border-radius:7px;padding:7px 14px;font-family:var(--font-body);font-weight:700;font-size:12px;cursor:pointer}

.prod-body{padding:10px 12px;flex:1}
.prod-name{font-family:var(--font-body);font-weight:700;font-size:13px;color:var(--ink);line-height:1.3;margin-bottom:2px}
.prod-sub{font-size:11px;color:var(--ink-muted)}
.prod-price{font-family:var(--font-display);font-size:15px;color:var(--green);margin-top:6px;font-weight:700}
.stock-yes{font-size:10px;font-weight:700;color:var(--green);background:var(--green-pale);padding:2px 7px;border-radius:100px}
.stock-no{font-size:10px;font-weight:700;color:#DC2626;background:#FEE2E2;padding:2px 7px;border-radius:100px}
.add-btn{margin:0 12px 12px;padding:8px;background:var(--green);color:#fff;border:none;border-radius:8px;font-family:var(--font-body);font-weight:700;font-size:13px;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:5px}
.add-btn:hover:not(:disabled){background:var(--green-light)}
.add-btn:disabled{background:var(--border);color:var(--ink-muted);cursor:not-allowed}
.qty-ctrl{display:flex;align-items:center;gap:6px;justify-content:center;padding:0 12px 12px}
.qty-btn{width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:var(--gray);cursor:pointer;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);transition:all .13s}
.qty-btn:hover{border-color:var(--green);background:var(--green-pale);color:var(--green)}
.qty-num{font-family:var(--font-body);font-weight:800;font-size:14px;min-width:24px;text-align:center}

.pills{display:flex;gap:7px;flex-wrap:wrap}
.pill{padding:6px 14px;border-radius:100px;font-family:var(--font-body);font-weight:500;font-size:12px;cursor:pointer;border:1px solid var(--border);background:#fff;color:var(--ink-soft);transition:all .15s;white-space:nowrap}
.pill:hover{border-color:var(--green);color:var(--green)}
.pill.active{background:var(--green);border-color:var(--green);color:#fff}

.cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300;animation:fade-in .18s}
@keyframes fade-in{from{opacity:0}}
@keyframes slide-right{from{transform:translateX(100%)}}
@keyframes pop-in{from{transform:scale(.94);opacity:0}}
.cart-panel{position:fixed;right:0;top:0;bottom:0;width:min(400px,100vw);background:#fff;z-index:301;display:flex;flex-direction:column;box-shadow:-8px 0 48px rgba(0,0,0,.18);animation:slide-right .28s cubic-bezier(.22,1,.36,1);font-family:var(--font-body)}
.cart-head{padding:18px 20px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--off-white);flex-shrink:0}
.cart-head-title{font-family:var(--font-display);font-size:20px;font-weight:800;color:var(--ink);display:flex;align-items:center;gap:9px}
.cart-badge{background:var(--green);color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:100px}
.cart-close-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border);background:var(--off-white);color:var(--ink-soft);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;font-weight:800}
.cart-close-btn:hover{background:#0c1a0c;color:#fff;border-color:#0c1a0c}
.cart-items-scroll{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.cart-row{display:grid;grid-template-columns:48px 1fr auto auto auto;align-items:center;gap:10px;padding:10px 12px;background:var(--off-white);border-radius:10px;border:1px solid var(--border)}
.cart-row-img{width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;background:var(--gray)}
.cart-row-name{font-weight:700;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.cart-row-unit{font-size:11px;color:var(--ink-muted);margin-top:1px}
.cart-row-qty-ctrl{display:flex;align-items:center;gap:5px}
.cqb{width:26px;height:26px;border-radius:6px;border:1.5px solid var(--border);background:#fff;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;color:var(--ink);transition:all .12s;line-height:1}
.cqb:hover{background:var(--green);color:#fff;border-color:var(--green)}
.cqn{font-weight:800;font-size:13px;width:22px;text-align:center}
.cart-row-line{font-family:var(--font-display);font-size:14px;color:var(--green);font-weight:700;white-space:nowrap}
.cart-row-del{background:none;border:none;cursor:pointer;color:#ddd;font-size:14px;padding:2px 4px;transition:color .13s}
.cart-row-del:hover{color:#DC2626}
.cart-empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--ink-muted);gap:10px;padding:40px}
.cart-footer{border-top:2px solid var(--off-white);padding:14px 18px 18px;display:flex;flex-direction:column;gap:10px;flex-shrink:0;background:#fff}
.mov-bar-wrap{background:var(--off-white);border-radius:9px;padding:10px 13px;border:1px solid var(--border)}
.mov-bar-labels{display:flex;justify-content:space-between;font-size:11px;color:var(--ink-muted);margin-bottom:6px;font-weight:600}
.mov-bar-track{height:5px;background:var(--border);border-radius:100px;overflow:hidden}
.mov-bar-fill{height:100%;background:linear-gradient(90deg,var(--green),#6bcf6b);border-radius:100px;transition:width .45s}
.mov-bar-msg{font-size:11px;text-align:center;margin-top:5px;font-weight:600;color:var(--ink-muted)}
.mov-bar-msg.met{color:var(--green)}
.cart-total-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0 4px}
.cart-total-label{font-size:13px;font-weight:600;color:var(--ink-soft)}
.cart-total-val{font-family:var(--font-display);font-size:24px;color:var(--green);font-weight:800}
.pay-section-label{font-size:10px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:7px}
.pay-chips{display:flex;flex-wrap:wrap;gap:6px}
.pay-chip{padding:6px 12px;border-radius:100px;border:1.5px solid var(--border);background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:var(--ink-soft);transition:all .15s;white-space:nowrap}
.pay-chip:hover{border-color:var(--green);color:var(--green)}
.pay-chip.sel{border-color:var(--green);background:var(--green-pale);color:var(--green)}
.pay-chip.credit-chip{border-color:#e9d5ff;color:#7c3aed}
.pay-chip.credit-chip.sel{background:#faf5ff;border-color:#7c3aed}
.pay-info{background:var(--off-white);border:1px solid var(--border);border-radius:9px;padding:9px 12px;font-size:12px;color:var(--ink-soft);line-height:1.7}
.cart-checkout-btn{padding:13px;border-radius:11px;border:none;font-family:var(--font-body);font-weight:800;font-size:14px;cursor:pointer;transition:all .18s;width:100%}
.cart-checkout-btn.ready{background:#1B6B1B;color:#fff}
.cart-checkout-btn.ready:hover{background:var(--green-light)}
.cart-checkout-btn.not-ready{background:var(--border);color:var(--ink-muted);cursor:not-allowed}
.cart-delivery-note{background:var(--green-pale);border-radius:8px;padding:8px 11px;font-size:11px;color:var(--ink-soft);display:flex;align-items:flex-start;gap:6px;line-height:1.5}
.float-cart{position:fixed;bottom:22px;right:22px;background:var(--green);color:#fff;border:none;border-radius:100px;padding:12px 22px;font-family:var(--font-body);font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 24px rgba(27,107,27,.45);display:flex;align-items:center;gap:9px;z-index:150;transition:all .18s;animation:pop-in .25s}
.float-cart:hover{background:var(--green-light);transform:translateY(-2px)}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);animation:fade-in .18s}
.modal-box{background:#fff;border-radius:18px;max-width:480px;width:100%;animation:pop-in .3s cubic-bezier(.22,1,.36,1);box-shadow:var(--shadow-xl);max-height:93vh;overflow-y:auto;position:relative}
.modal-x{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:8px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;transition:all .15s;z-index:10}
.modal-x:hover{background:rgba(255,255,255,.25)}
.modal-x.dark{border-color:var(--border);background:var(--gray);color:var(--ink-soft)}
.modal-x.dark:hover{background:var(--ink);color:#fff}
.modal-head{background:#0c1a0c;padding:26px 26px 20px;text-align:center;position:relative;border-radius:18px 18px 0 0}
.modal-head img{height:38px;margin-bottom:12px}
.modal-head h2{font-family:var(--font-display);font-size:22px;color:#fff;margin-bottom:3px;font-weight:800}
.modal-head p{font-size:12px;color:rgba(255,255,255,.5)}
.modal-body{padding:20px 24px 26px}
.modal-error{background:#FEE2E2;border:1px solid #FCA5A5;border-radius:8px;padding:9px 13px;font-size:13px;color:#DC2626;margin-bottom:12px;font-weight:600}

/* FIX #3: Login styling — lowercase, standard font size */
.form-field{margin-bottom:13px}
.form-label{display:block;font-family:var(--font-body);font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:5px}
.form-input{width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:9px;font-family:var(--font-body);font-size:14px;color:var(--ink);outline:none;transition:border-color .18s;background:#fff}
.form-input:focus{border-color:var(--green)}
/* FIX #3: Remove uppercase from access code input */
.code-input{font-family:monospace;font-size:20px;font-weight:900;text-align:center;letter-spacing:.15em;text-transform:none !important}

.modal-submit{width:100%;padding:12px;background:var(--green);color:#fff;border:none;border-radius:9px;font-family:var(--font-body);font-weight:800;font-size:14px;cursor:pointer;margin-top:7px;transition:all .18s}
.modal-submit:hover{background:var(--green-light)}
.modal-back{width:100%;padding:9px;margin-top:7px;background:none;border:1px solid var(--border);border-radius:8px;font-family:var(--font-body);font-weight:600;font-size:13px;cursor:pointer;color:var(--ink-soft)}
.modal-back:hover{border-color:var(--green)}
.success-modal{background:#fff;border-radius:18px;padding:38px 30px;max-width:420px;width:100%;text-align:center;animation:pop-in .3s cubic-bezier(.22,1,.36,1);box-shadow:var(--shadow-xl);position:relative}
.success-icon{font-size:52px;margin-bottom:14px}
.success-title{font-family:var(--font-display);font-size:26px;color:var(--green);margin-bottom:8px;font-weight:800}
.success-sub{color:var(--ink-muted);font-size:13px;line-height:1.7;margin-bottom:18px;font-weight:300}
.order-id-box{background:var(--green-pale);border:2px solid var(--green-light);border-radius:10px;padding:10px 18px;font-family:monospace;font-size:20px;color:var(--green);margin-bottom:18px;letter-spacing:.04em;font-weight:900}

.toast{position:fixed;top:72px;right:16px;z-index:600;background:#0f430f;color:#fff;border-radius:12px;padding:14px 42px 14px 18px;box-shadow:var(--shadow-xl);animation:pop-in .25s;max-width:320px;min-width:240px;font-family:var(--font-body);font-weight:600;font-size:13px;border:1px solid rgba(125,216,125,.2)}
.toast-close{position:absolute;top:7px;right:10px;background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:15px;font-weight:800}
.toast-warn{background:#991b1b;border-color:rgba(220,38,38,.3)}

/* FIX #2: Quick view modal */
.quickview-modal{background:#fff;border-radius:18px;max-width:680px;width:100%;animation:pop-in .3s cubic-bezier(.22,1,.36,1);box-shadow:var(--shadow-xl);position:relative;overflow:hidden;display:grid;grid-template-columns:1fr 1fr}
.quickview-img{height:100%;min-height:280px;overflow:hidden;background:var(--gray)}
.quickview-img img{width:100%;height:100%;object-fit:cover;display:block}
.quickview-body{padding:26px 24px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;max-height:85vh}
.quickview-name{font-family:var(--font-display);font-size:20px;font-weight:800;color:var(--ink);line-height:1.2}
.quickview-sub{font-size:12px;color:var(--ink-muted)}
.quickview-price{font-size:22px;font-weight:800;color:var(--green)}
.quickview-desc{font-size:13px;color:var(--ink-soft);line-height:1.7;font-weight:300}
.quickview-stock{display:inline-flex;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700}

footer{background:#060e06;padding:48px 24px 24px;border-top:1px solid rgba(255,255,255,.04)}
.footer-inner{max-width:1100px;margin:0 auto}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:32px}
.footer-brand{display:flex;align-items:center;gap:9px;margin-bottom:12px;cursor:pointer}
.footer-brand img{height:32px;object-fit:contain}
.footer-brand-name{font-family:var(--font-display);font-size:18px;color:#fff;font-weight:800}
.footer-brand-name span{color:#ff8040}
.footer-desc{font-size:13px;color:rgba(255,255,255,.3);line-height:1.8;max-width:270px;font-weight:300}
.footer-col-title{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.22);margin-bottom:14px}
.footer-link{display:block;font-size:13px;color:rgba(255,255,255,.4);margin-bottom:8px;cursor:pointer;transition:color .15s;text-decoration:none;font-weight:300}
.footer-link:hover{color:rgba(255,255,255,.75)}
.footer-divider{border:none;border-top:1px solid rgba(255,255,255,.05);margin-bottom:16px}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.footer-copy{font-size:11px;color:rgba(255,255,255,.2);font-weight:300}
.footer-version{font-size:10px;color:rgba(255,255,255,.12);letter-spacing:.08em}

.toggle{position:relative;display:inline-block;width:38px;height:21px}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;inset:0;background:var(--border);border-radius:100px;cursor:pointer;transition:.25s}
.toggle-slider:before{content:'';position:absolute;width:15px;height:15px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s}
input:checked+.toggle-slider{background:var(--green-light)}
input:checked+.toggle-slider:before{transform:translateX(17px)}

.admin-wrap{display:grid;grid-template-columns:210px 1fr;min-height:calc(100vh - 62px)}
.admin-sidebar{background:#0c1a0c;padding:16px 8px;display:flex;flex-direction:column;gap:2px;border-right:1px solid rgba(255,255,255,.05)}
.admin-sidebar-label{font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.18);padding:5px 10px;margin-top:10px}
.admin-nav-btn{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;cursor:pointer;color:rgba(255,255,255,.4);font-size:13px;font-weight:500;transition:all .15s;border:none;background:none;width:100%;text-align:left}
.admin-nav-btn:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.75)}
.admin-nav-btn.active{background:rgba(125,216,125,.12);color:#7dd87d}
.admin-content{padding:26px;overflow-y:auto;background:var(--off-white)}
.admin-title{font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--ink);margin-bottom:3px;letter-spacing:-.02em}
.admin-sub{color:var(--ink-muted);font-size:13px;margin-bottom:22px;font-weight:300}
.stats-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-bottom:22px}
.stat-card{background:#fff;border-radius:12px;padding:18px;box-shadow:var(--shadow-sm);border:1px solid var(--border);transition:all .18s}
.stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.stat-icon{font-size:20px;margin-bottom:9px}
.stat-value{font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--ink)}
.stat-label{font-size:10px;color:var(--ink-muted);margin-top:2px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.stat-note{font-size:11px;color:var(--green);font-weight:600;margin-top:4px}

table{width:100%;border-collapse:collapse}
th{padding:9px 13px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted);background:var(--off-white);border-bottom:1.5px solid var(--border)}
td{padding:11px 13px;font-size:13px;color:var(--ink-soft);border-bottom:1px solid #f0f4f0;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafcfa}
.tag{display:inline-block;padding:2px 8px;border-radius:100px;font-size:11px;font-weight:700;background:var(--green-pale);color:var(--green)}
.tag-credit{background:#ede9fe;color:#5b21b6}
.status-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:100px;font-size:11px;font-weight:700}
.status-dot{width:5px;height:5px;border-radius:50%}
.status-select{padding:4px 9px;border-radius:7px;border:1px solid var(--border);font-size:12px;font-weight:700;cursor:pointer;outline:none}
.form-section{background:#fff;border-radius:12px;padding:22px;border:1px solid var(--border);margin-bottom:18px}
.form-section-title{font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:16px;color:var(--ink);padding-bottom:11px;border-bottom:1px solid var(--border)}
.admin-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.admin-form-full{grid-column:1/-1}
.admin-form-field{display:flex;flex-direction:column;gap:4px}
.admin-form-field label{font-size:10px;font-weight:700;color:var(--ink-soft);letter-spacing:.07em;text-transform:uppercase}
.admin-form-field input,.admin-form-field select,.admin-form-field textarea{padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:var(--font-body);font-size:14px;color:var(--ink);background:#fff;transition:border-color .15s;outline:none;width:100%}
.admin-form-field input:focus,.admin-form-field select:focus,.admin-form-field textarea:focus{border-color:var(--green)}
.margin-calc{background:#071507;border-radius:12px;padding:22px;margin-bottom:18px}
.margin-calc-title{font-family:var(--font-display);font-size:17px;color:#a8e6a8;margin-bottom:14px;font-weight:700}
.margin-calc-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.margin-input-field label{color:rgba(255,255,255,.45);font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;display:block;margin-bottom:4px}
.margin-input-field input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;padding:8px 12px;border-radius:7px;font-size:14px;outline:none;width:100%}
.margin-result{background:rgba(168,230,168,.08);border:1px solid rgba(168,230,168,.18);border-radius:7px;padding:10px 14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center}
.margin-result-label{font-size:12px;color:rgba(255,255,255,.4)}
.margin-result-value{font-family:var(--font-display);font-size:22px;color:#a8e6a8;font-weight:700}
.photo-upload-area{border:2px dashed var(--border);border-radius:10px;padding:16px;background:var(--off-white);display:flex;flex-direction:column;align-items:center;gap:10px;transition:border-color .18s}
.photo-upload-area:hover{border-color:var(--green-pale2)}
.feedback-card{background:#fff;border-radius:12px;border:1px solid var(--border);padding:16px 18px;margin-bottom:12px;box-shadow:var(--shadow-sm);position:relative}
.sec-log-entry{display:flex;gap:10px;padding:9px 12px;border-radius:8px;margin-bottom:6px;font-size:12px;align-items:flex-start}
.sec-log-ok{background:#f0fdf4;border:1px solid #bbf7d0}
.sec-log-warn{background:#fff7ed;border:1px solid #fed7aa}
.pay-gw-card{background:#fff;border-radius:12px;padding:22px;border:1px solid var(--border);box-shadow:var(--shadow-sm);margin-bottom:14px}
.pay-gw-title{font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px;padding-bottom:11px;border-bottom:1px solid var(--border)}
.order-code-box{background:#0c1a0c;border-radius:12px;padding:16px 20px;margin-bottom:14px;text-align:center}
.order-code-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}
.order-code-value{font-family:monospace;font-size:26px;font-weight:900;color:#7dd87d;letter-spacing:.1em}
.order-code-copy-btn{margin-top:10px;background:rgba(125,216,125,.15);border:1px solid rgba(125,216,125,.25);color:#7dd87d;border-radius:7px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.order-code-copy-btn:hover{background:rgba(125,216,125,.25)}
.founders-section{background:#fff;padding:56px 24px}
.founders-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:960px;margin:0 auto}
.founder-card{border-radius:18px;overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--border);background:#fff}
.founder-photo-wrap{position:relative;height:280px;background:linear-gradient(160deg,#1a3a1a,#2d6b2d);overflow:hidden;display:flex;align-items:center;justify-content:center}
.founder-role-badge{position:absolute;bottom:14px;left:14px;background:rgba(0,0,0,.6);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.15);color:#fff;padding:5px 13px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.founder-body{padding:22px 24px 26px}
.founder-name{font-family:var(--font-display);font-size:24px;color:var(--ink);margin-bottom:4px;font-weight:800}
.founder-title{font-size:10px;font-weight:700;color:var(--orange);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.founder-bio{font-size:14px;color:var(--ink-soft);line-height:1.78;font-weight:300}
.founder-contacts{display:flex;gap:7px;margin-top:12px;flex-wrap:wrap}
.founder-contact-chip{background:var(--off-white);border:1px solid var(--border);border-radius:100px;padding:5px 12px;font-size:12px;color:var(--ink-soft)}
.values-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px;margin-top:32px}
.value-card{background:var(--off-white);border-radius:12px;padding:22px;border:1.5px solid var(--border);text-align:center;transition:all .2s}
.value-card:hover{transform:translateY(-3px);box-shadow:var(--shadow);border-color:var(--green-pale2);background:#fff}
.value-icon{font-size:28px;margin-bottom:10px}
.value-title{font-family:var(--font-display);font-size:16px;color:var(--ink);margin-bottom:6px;font-weight:700}
.value-desc{font-size:13px;color:var(--ink-muted);line-height:1.7;font-weight:300}
.future-section{background:linear-gradient(160deg,#071507,#1a4020);padding:56px 24px}
.future-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-top:36px}
.future-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:20px;transition:all .22s}
.future-card:hover{background:rgba(255,255,255,.08);transform:translateY(-3px)}
.future-year{font-size:10px;font-weight:700;color:#ff8040;letter-spacing:.12em;text-transform:uppercase;margin-bottom:7px}
.future-title{font-family:var(--font-display);font-size:18px;color:#fff;margin-bottom:7px;font-weight:700}
.future-desc{font-size:13px;color:rgba(255,255,255,.48);line-height:1.7;font-weight:300}
.partners-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:28px}
.partner-card{background:#fff;border-radius:12px;border:1.5px solid var(--border);overflow:hidden;box-shadow:var(--shadow-sm);transition:all .22s;text-align:center}
.partner-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.partner-logo-wrap{height:80px;display:flex;align-items:center;justify-content:center;background:var(--off-white);overflow:hidden;border-bottom:1px solid var(--border)}
.partner-logo-wrap img{width:100%;height:100%;object-fit:cover}
.partner-body{padding:10px}
.partner-name{font-weight:700;font-size:13px;color:var(--ink);margin-bottom:2px}
.partner-type{font-size:11px;color:var(--green);font-weight:600}
.loading-screen{position:fixed;inset:0;background:#0c1a0c;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999;gap:16px}
.loading-spinner{width:40px;height:40px;border:3px solid rgba(125,216,125,.2);border-top-color:#7dd87d;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-text{font-size:13px;color:rgba(255,255,255,.5);font-weight:300}
.mobile-bottom-bar{display:none;position:fixed;bottom:0;left:0;right:0;background:#0c1a0c;border-top:1px solid rgba(255,255,255,.08);padding:8px 16px;z-index:150;gap:8px;align-items:center;justify-content:space-between}
.mobile-bottom-bar-total{font-family:var(--font-display);font-size:16px;color:#7dd87d;font-weight:800}
.mobile-bottom-bar-items{font-size:11px;color:rgba(255,255,255,.5)}
.mobile-bottom-bar-btn{background:var(--green);color:#fff;border:none;border-radius:9px;padding:10px 20px;font-family:var(--font-body);font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:7px}
.pagination{display:flex;align-items:center;justify-content:center;gap:8px;padding:22px 0 6px}
.page-btn{padding:7px 14px;border-radius:8px;border:1.5px solid var(--border);background:#fff;font-weight:600;font-size:13px;cursor:pointer;transition:all .15s;color:var(--ink-soft)}
.page-btn:hover{border-color:var(--green);color:var(--green)}
.page-btn.active{background:var(--green);border-color:var(--green);color:#fff}
.page-btn:disabled{opacity:.4;cursor:not-allowed}
.security-attempts{background:#7f1d1d;border:1px solid #b91c1c;border-radius:9px;padding:11px 14px;font-size:13px;color:#fca5a5;margin-bottom:12px;line-height:1.6}

/* FIX #4: Mobile responsive */
@media(max-width:900px){
  .founders-grid{grid-template-columns:1fr}
  .admin-wrap{grid-template-columns:1fr}
  .admin-sidebar{flex-direction:row;flex-wrap:wrap;padding:6px 8px;gap:3px;border-right:none;border-bottom:1px solid rgba(255,255,255,.05);overflow-x:auto}
  .admin-sidebar-label{display:none}
  .admin-nav-btn{padding:6px 9px;font-size:12px;flex-shrink:0}
  .admin-content{padding:14px}
  .footer-grid{grid-template-columns:1fr;gap:22px}
  .margin-calc-grid{grid-template-columns:1fr}
  .admin-form-grid{grid-template-columns:1fr}
  .section{padding:28px 16px}
  .stats-row{grid-template-columns:1fr 1fr}
  .quickview-modal{grid-template-columns:1fr}
  .quickview-img{min-height:200px;max-height:240px}
}
@media(max-width:640px){
  html,body{overflow-x:hidden !important}
  .nav-top{padding:0 12px;height:auto;flex-wrap:wrap;padding-top:8px;padding-bottom:8px;gap:8px}
  .nav-brand{font-size:16px}
  .nav-search{display:flex;margin:0 8px}
  .hero-wrap{padding:40px 16px 32px}
  .hero-title{font-size:clamp(22px,7vw,32px) !important}
  .hero-cta-row{flex-direction:column;align-items:center}
  .hero-cta-row .btn-primary,.hero-cta-row .btn-ghost{width:100%;max-width:290px;justify-content:center}
  .prod-grid{grid-template-columns:1fr 1fr;gap:9px}
  .cart-panel{width:100vw}
  .modal-overlay{padding:10px}
  .modal-box{border-radius:14px;max-height:96vh}
  .steps-section{padding:40px 16px}
  .step-grid{grid-template-columns:1fr 1fr;gap:10px}
  .stats-row{grid-template-columns:1fr 1fr;gap:8px}
  table{min-width:500px}
  .card>div{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .mobile-bottom-bar{display:flex !important}
  .quickview-modal{grid-template-columns:1fr}
  .quickview-img{min-height:180px}
  .welcome-bar{display:none}
}
`;


// =============================================================================
// SHARED COMPONENTS
// =============================================================================
function Logo({ height=38, style={} }) {
  return <img src={LOGO_SRC} alt="Menamart" style={{ height, width:"auto", objectFit:"contain", ...style }} />;
}

function PhotoUpload({ value, onChange, label="Imagem" }) {
  const ref = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target.result);
    reader.readAsDataURL(file); e.target.value="";
  };
  return (
    <div>
      <label className="form-label" style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em"}}>{label}</label>
      <div className="photo-upload-area" style={{marginTop:5}}>
        {value ? (
          <div style={{position:"relative",width:"100%"}}>
            <img src={value} alt="preview" style={{width:"100%",height:120,objectFit:"cover",borderRadius:7,display:"block"}} onError={e=>{e.target.style.display="none"}} />
            <button onClick={()=>onChange("")} style={{position:"absolute",top:5,right:5,background:"#DC2626",color:"#fff",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✕</button>
          </div>
        ) : <div style={{fontSize:36,opacity:.2}}>🖼️</div>}
        <button type="button" onClick={()=>ref.current.click()} className="btn-green" style={{width:"auto"}}>📁 Carregar</button>
        <input type="text" value={value&&value.startsWith("data:")?"":value||""} onChange={e=>onChange(e.target.value)} placeholder="ou URL: https://..." style={{width:"100%",padding:"7px 11px",border:"1px solid var(--border)",borderRadius:7,fontSize:13,outline:"none"}} />
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile} />
    </div>
  );
}

// FIX #2: Quick View Modal
function QuickViewModal({ product, currentUser, onAdd, onClose, cartItem, onChangeQty }) {
  const inCart = cartItem && cartItem.qty > 0;
  useEffect(() => {
    const h = e => { if(e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="quickview-modal">
        <button className="modal-x dark" onClick={onClose} style={{top:10,right:10,zIndex:20}}>✕</button>
        <div className="quickview-img">
          <img src={product.img} alt={product.name} onError={e=>{e.target.src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80"}} />
        </div>
        <div className="quickview-body">
          <div>
            <div className="quickview-name">{product.name}</div>
            <div className="quickview-sub">{product.sub}</div>
          </div>
          {/* FIX #5: Price protection */}
          {currentUser ? (
            <div className="quickview-price">{fmt(product.sellingPrice)}</div>
          ) : (
            <div className="price-hidden">🔒 Registe-se para ver o preço</div>
          )}
          <div>
            {product.stock
              ? <span className="quickview-stock" style={{background:"var(--green-pale)",color:"var(--green)"}}>✓ Em Stock</span>
              : <span className="quickview-stock" style={{background:"#FEE2E2",color:"#DC2626"}}>✗ Esgotado</span>
            }
          </div>
          <div className="quickview-desc">{product.desc || product.sub}</div>
          {currentUser && (
            inCart ? (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button className="qty-btn" onClick={()=>onChangeQty(product.id,-1)}>−</button>
                <span style={{fontWeight:800,fontSize:15,minWidth:24,textAlign:"center"}}>{cartItem.qty}</span>
                <button className="qty-btn" onClick={()=>onChangeQty(product.id,1)}>+</button>
                <span style={{fontSize:12,color:"var(--ink-muted)"}}>{product.sub}</span>
              </div>
            ) : (
              <button className="add-btn" style={{margin:0,borderRadius:9,padding:"10px 0"}} onClick={()=>{onAdd(product);onClose();}} disabled={!product.stock}>
                {product.stock ? "🛒 Adicionar ao cesto" : "Esgotado"}
              </button>
            )
          )}
          {!currentUser && (
            <div style={{background:"var(--orange-pale)",border:"1px solid #fcd9bc",borderRadius:9,padding:"11px 14px",fontSize:13,color:"var(--orange-dark)",fontWeight:600,textAlign:"center"}}>
              🔐 Faça login para encomendar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// FIX #1: ProductCard with edit/delete for admin
function ProductCard({ product, cartItem, onAdd, onChangeQty, onQuickView, currentUser, isAdmin, onEdit, onDelete }) {
  const inCart = cartItem && cartItem.qty > 0;
  return (
    <div className={`prod-card${product.stock ? "" : " out-of-stock"}`}>
      <div className="prod-img" onClick={() => onQuickView(product)}>
        <img src={product.img} alt={product.name} onError={e=>{e.target.src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80"}} />
        {!product.stock && <div className="oos-badge">Esgotado</div>}
        <div className="quick-view-overlay">
          <button className="quick-view-btn">🔍 Ver detalhes</button>
        </div>
      </div>
      <div className="prod-body">
        <div className="prod-name">{product.name}</div>
        <div className="prod-sub">{product.sub}</div>
        {/* FIX #5: Hide price for guests */}
        {currentUser ? (
          <div className="prod-price">{fmt(product.sellingPrice)}</div>
        ) : (
          <div style={{marginTop:6}}><span className="price-hidden">🔒 Ver preço</span></div>
        )}
        <div style={{marginTop:4}}>{product.stock ? <span className="stock-yes">✓ Em Stock</span> : <span className="stock-no">✗ Esgotado</span>}</div>
      </div>
      {/* FIX #1: Admin edit/delete buttons */}
      {isAdmin && (
        <div style={{display:"flex",gap:6,padding:"0 12px 10px"}}>
          <button className="btn-sm btn-gray" style={{flex:1}} onClick={()=>onEdit(product)}>✏️ Editar</button>
          <button className="btn-sm btn-red" style={{flex:1}} onClick={()=>onDelete(product)}>🗑️ Apagar</button>
        </div>
      )}
      {!isAdmin && currentUser && (
        inCart ? (
          <div className="qty-ctrl">
            <button className="qty-btn" onClick={()=>onChangeQty(product.id,-1)}>−</button>
            <input type="number" min="1" value={cartItem.qty} onChange={e=>{const v=parseInt(e.target.value);if(!isNaN(v)&&v>0)onChangeQty(product.id,v-cartItem.qty);}} style={{width:40,textAlign:"center",border:"1px solid var(--border)",borderRadius:6,fontWeight:800,fontSize:14,padding:"2px 0",outline:"none"}} />
            <button className="qty-btn" onClick={()=>onChangeQty(product.id,1)}>+</button>
          </div>
        ) : (
          <button className="add-btn" onClick={()=>onAdd(product)} disabled={!product.stock}>
            {product.stock ? "🛒 Encomendar" : "Indisponível"}
          </button>
        )
      )}
    </div>
  );
}

// FIX #7: Amazon-style NavBar — logo left, search center, cart+account right
// FIX #7: Sobre Nós and Contacto REMOVED from navbar, moved to footer
function NavBar({ page, goTo, currentUser, cartCount=0, onCartOpen, onSearch, searchValue="" }) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const handleSearch = e => { e.preventDefault(); onSearch && onSearch(localSearch); };
  return (
    <nav className="nav">
      <div className="nav-top">
        {/* Logo left */}
        <div className="nav-logo" onClick={()=>goTo("home")}>
          <Logo height={56} />
          <span className="nav-brand"><span className="nav-brand-mena">Mena</span><span className="nav-brand-mart">mart</span></span>
        </div>
        {/* Search center */}
        <form className="nav-search" onSubmit={handleSearch} style={{flex:1,margin:"0 16px"}}>
          <input
            placeholder="Pesquisar produtos HORECA..."
            value={localSearch}
            onChange={e=>{setLocalSearch(e.target.value);onSearch&&onSearch(e.target.value);}}
          />
          <button type="submit" className="nav-search-btn">🔍</button>
        </form>
        {/* Right: cart + account */}
        <div className="nav-right">
          {currentUser ? (
            <>
              <span className="user-pill" onClick={()=>goTo("account")}>👤 {currentUser.businessName}</span>
              <button className="cart-btn" onClick={onCartOpen}>
                🛒 {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </button>
            </>
          ) : (
            <button className="btn-outline-nav" onClick={()=>goTo("login")}>Entrar →</button>
          )}
        </div>
      </div>
     {/* Mobile search row */}
      <div className="nav-search-row">
        <div className="nav-search-row-inner">
          <input
            placeholder="Pesquisar produtos HORECA..."
            value={localSearch}
            onChange={e=>{setLocalSearch(e.target.value);onSearch&&onSearch(e.target.value);}}
          />
          <button onClick={handleSearch}>🔍</button>
        </div>
      </div>
      {/* FIX #7: Welcome bar for logged-in users */}
      {currentUser && (
        <div className="welcome-bar">
          <div className="welcome-text">Bem-vindo, {currentUser.businessName} — {currentUser.type}</div>
        </div>
      )}
    </nav>
  );
}

// FIX #7: Footer now includes Sobre Nós and Contacto
function Footer({ goTo, onSecretClick }) {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand" onClick={onSecretClick}>
              <Logo height={44} />
              <span className="footer-brand-name">Mena<span>mart</span></span>
            </div>
            <p className="footer-desc">Plataforma B2B de abastecimento alimentar para o sector HORECA em Luanda, Angola.</p>
          </div>
          {/* FIX #7: Sobre Nós and Contacto in footer */}
          <div>
            <div className="footer-col-title">Empresa</div>
            <span className="footer-link" onClick={()=>goTo("sobre")}>Sobre Nós</span>
            <span className="footer-link" onClick={()=>goTo("contacto")}>Contacto</span>
            <a href={waLink("Olá Menamart! Gostaria de registar a minha empresa.")} target="_blank" rel="noreferrer" className="footer-link">💬 Registar Empresa</a>
          </div>
          <div>
            <div className="footer-col-title">Contacto</div>
            <span className="footer-link">📧 menamart.angola@gmail.com</span>
            <span className="footer-link">💬 +244 933 929 233</span>
            <span className="footer-link">📍 Rua de Benguela, São Paulo, Luanda</span>
            <span className="footer-link">🕐 07:00–18:00 (Seg–Sáb)</span>
          </div>
        </div>
        <hr className="footer-divider" />
        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Menamart. Todos os direitos reservados.</span>
          <span className="footer-version">v{APP_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}

// Invoice Modal
function InvoiceModal({ order, onClose }) {
  const printInvoice = () => {
    const win = window.open("","_blank","width=800,height=600");
    win.document.write(`<html><head><title>Factura ${order.id}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#0c1a0c;font-size:13px;max-width:740px;margin:0 auto}.header{background:#0c1a0c;color:#fff;padding:22px 26px;border-radius:10px;margin-bottom:22px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}.brand{font-size:24px;font-weight:800}.brand span{color:#ff8040}.inv-num{font-size:11px;opacity:.6;margin-top:3px}table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#f0f4f0;padding:7px 11px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-align:left}td{padding:8px 11px;border-bottom:1px solid #f0f4f0;font-size:13px}.total-row{display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #0c1a0c;margin-top:3px}.total-val{font-size:24px;font-weight:800;color:#1B6B1B}@media print{body{padding:0}}</style></head><body>
    <div class="header"><div><div class="brand">Mena<span>mart</span></div><div class="inv-num">${order.id}</div></div><div style="font-size:11px;opacity:.6;text-align:right">Data: ${order.date}<br/>Luanda, Angola</div></div>
    <table><thead><tr><th>Produto</th><th style="text-align:center">Qtd.</th><th style="text-align:right">Preço</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${(order.items||[]).map(i=>`<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">AKZ ${new Intl.NumberFormat("pt-AO").format(i.price)}</td><td style="text-align:right">AKZ ${new Intl.NumberFormat("pt-AO").format(i.total||i.price*i.qty)}</td></tr>`).join("")}</tbody></table>
    <div class="total-row"><span style="font-weight:800;font-size:14px">Total</span><span class="total-val">AKZ ${new Intl.NumberFormat("pt-AO").format(Math.round(order.total))}</span></div>
    <div style="background:#f8faf8;padding:12px 14px;border-radius:8px;font-size:11px;color:#6b8a6b;text-align:center;line-height:1.7;margin-top:14px">Menamart Lda · Rua de Benguela, São Paulo, Luanda · menamart.angola@gmail.com</div>
    </body></html>`);
    win.document.close(); setTimeout(()=>win.print(),400);
  };
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style={{maxWidth:560}}>
        <button className="modal-x dark" onClick={onClose}>✕</button>
        <div style={{padding:"16px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)",paddingBottom:13}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:19,fontWeight:700}}>Factura / Recibo</div>
          <button className="btn-green" onClick={printInvoice}>🖨️ Imprimir</button>
        </div>
        <div style={{padding:"16px 20px 22px"}}>
          <div style={{background:"#0c1a0c",borderRadius:9,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,color:"#fff",fontWeight:800}}>Mena<span style={{color:"#ff8040"}}>mart</span><div style={{fontFamily:"monospace",fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{order.id}</div></div>
            <div style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,.55)",lineHeight:1.8}}>{order.date}<br/>Luanda, Angola</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{minWidth:360}}>
              <thead><tr><th>Produto</th><th style={{textAlign:"center"}}>Qtd.</th><th style={{textAlign:"right"}}>Preço</th><th style={{textAlign:"right"}}>Total</th></tr></thead>
              <tbody>{(order.items||[]).map((item,i)=><tr key={i}><td style={{fontWeight:600}}>{item.name}</td><td style={{textAlign:"center"}}>{item.qty}</td><td style={{textAlign:"right",color:"var(--ink-muted)"}}>{fmt(item.price)}</td><td style={{textAlign:"right",color:"var(--green)",fontWeight:700}}>{fmt(item.total||item.price*item.qty)}</td></tr>)}</tbody>
            </table>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderTop:"2px solid var(--ink)",marginTop:3}}>
            <span style={{fontWeight:800,fontSize:14}}>Total</span>
            <span style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--green)",fontWeight:800}}>{fmt(order.total)}</span>
          </div>
          <a href={waLink(`📋 Factura *${order.id}*\nCliente: ${order.clientName}\nTotal: ${fmt(order.total)}`)} target="_blank" rel="noreferrer" className="btn-wa" style={{marginTop:10}}>💬 Enviar via WhatsApp</a>
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// PUBLIC PAGES
// =============================================================================
function PublicLanding({ goTo }) {
  return (
    <div>
      <div className="hero-wrap">
        <Logo height={90} style={{display:"block",margin:"0 auto 20px",opacity:.9}} />
        <div className="hero-badge">🌱 Plataforma B2B · Luanda, Angola</div>
        <h1 className="hero-title">O abastecimento<br /><em>alimentar</em> que o<br />seu negócio merece</h1>
        <p className="hero-sub">Fornecemos hotéis, restaurantes e catering com produtos de qualidade. Acesso exclusivo para empresas verificadas.</p>
        <div className="hero-cta-row">
          <a href={waLink("Olá Menamart! Gostaria de registar a minha empresa na plataforma B2B.")} target="_blank" rel="noreferrer" className="btn-primary">💬 Registar via WhatsApp</a>
          <button className="btn-ghost" onClick={()=>goTo("login")}>Já tenho conta →</button>
        </div>
      </div>
      <div className="steps-section">
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="eyebrow">Como Funciona</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(24px,4vw,38px)",color:"var(--ink)",textAlign:"center",marginBottom:10,fontWeight:800}}>Simples, rápido e seguro</h2>
          <p style={{color:"var(--ink-muted)",fontSize:14,textAlign:"center",maxWidth:460,margin:"0 auto 36px",lineHeight:1.75,fontWeight:300}}>Acesso exclusivo para empresas verificadas.</p>
          <div className="step-grid">
            {[{n:1,icon:"💬",title:"Contacte via WhatsApp",desc:"Envie os dados da sua empresa."},{n:2,icon:"✅",title:"Verificação em 24h",desc:"A nossa equipa verifica e aprova."},{n:3,icon:"🔑",title:"Recebe o código",desc:"Código de acesso único via WhatsApp."},{n:4,icon:"🛒",title:"Encomende",desc:"Entre e comece a encomendar."}].map((s,i)=>(
              <div key={i} className="step-card"><div className="step-num">{s.n}</div><div className="step-icon">{s.icon}</div><div className="step-title">{s.title}</div><div className="step-desc">{s.desc}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"var(--off-white)",padding:"56px 24px",borderTop:"1px solid var(--border)"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="eyebrow">Porquê a Menamart?</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(22px,4vw,34px)",textAlign:"center",marginBottom:36,fontWeight:800}}>Confiança, Qualidade, Pontualidade</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16}}>
            {[{icon:"⚡",t:"Entregas Rápidas",d:"07:00–18:00, Segunda a Sexta."},{icon:"✅",t:"Qualidade Verificada",d:"Produtos inspeccionados antes da entrega."},{icon:"🤝",t:"Só Empresas",d:"Acesso restrito a empresas verificadas."},{icon:"💰",t:"Preços Transparentes",d:"Preços justos, sem surpresas."},{icon:"📅",t:"Crédito Disponível",d:"Clientes aprovados pagam a 7 ou 30 dias."},{icon:"📱",t:"Suporte WhatsApp",d:"Resposta em menos de 1 hora."}].map((v,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:11,padding:20,border:"1px solid var(--border)"}}><div style={{fontSize:24,marginBottom:9}}>{v.icon}</div><div style={{fontFamily:"var(--font-display)",fontSize:15,color:"var(--ink)",marginBottom:5,fontWeight:700}}>{v.t}</div><div style={{fontSize:13,color:"var(--ink-muted)",lineHeight:1.7,fontWeight:300}}>{v.d}</div></div>
            ))}
          </div>
        </div>
      </div>
      <Footer goTo={goTo} />
    </div>
  );
}

function PageSobreNos({ goTo, partners }) {
  return (
    <div style={{background:"var(--off-white)"}}>
      <div className="hero-wrap">
        <div className="hero-badge">🏢 Sobre Nós</div>
        <h1 className="hero-title" style={{fontSize:"clamp(24px,5vw,48px)"}}>A equipa por trás da <em>Menamart</em></h1>
        <p className="hero-sub">Dois empreendedores luandenses com uma missão: simplificar o abastecimento alimentar para o sector HORECA em Angola.</p>
      </div>
      <div className="founders-section">
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div className="eyebrow">Os Fundadores</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(20px,4vw,34px)",textAlign:"center",marginBottom:32,fontWeight:800}}>Conheça quem criou a Menamart</h2>
          <div className="founders-grid">
            {[{name:"Fundador 1",role:"Co-Fundador & CEO",title:"Estratégia & Crescimento",bio:"Responsável pela estratégia comercial e expansão da Menamart em Luanda.",contacts:["📱 +244 9XX XXX XXX"]},{name:"Fundador 2",role:"Co-Fundador & COO",title:"Operações & Logística",bio:"Gere as operações logísticas e a rede de fornecedores em Angola.",contacts:["📱 +244 9XX XXX XXX"]}].map((f,i)=>(
              <div key={i} className="founder-card">
                <div className="founder-photo-wrap"><div style={{fontSize:90,opacity:.1,color:"#fff"}}>👤</div><div className="founder-role-badge">{f.role}</div></div>
                <div className="founder-body"><div className="founder-name">{f.name}</div><div className="founder-title">{f.title}</div><div className="founder-bio">{f.bio}</div><div className="founder-contacts">{f.contacts.map((c,j)=><span key={j} className="founder-contact-chip">{c}</span>)}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"#fff",padding:"56px 24px",borderTop:"1px solid var(--border)"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div className="eyebrow">Os Nossos Valores</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(20px,4vw,34px)",textAlign:"center",marginBottom:8,fontWeight:800}}>Missão, Visão & Objectivos</h2>
          <div className="values-grid">
            {[{icon:"🎯",t:"Missão",d:"Simplificar o abastecimento alimentar B2B em Luanda."},{icon:"🌍",t:"Visão",d:"Ser a principal plataforma HORECA em Angola."},{icon:"🤝",t:"Valores",d:"Honestidade, pontualidade e qualidade."},{icon:"🏆",t:"Objectivo 2026",d:"100 clientes activos em Luanda."}].map((v,i)=>(
              <div key={i} className="value-card"><div className="value-icon">{v.icon}</div><div className="value-title">{v.t}</div><div className="value-desc">{v.d}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div className="future-section">
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div className="eyebrow" style={{color:"rgba(255,180,80,.7)"}}>Visão para o Futuro</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(20px,4vw,36px)",color:"#fff",textAlign:"center",marginBottom:8,fontWeight:800}}>O Futuro da Menamart</h2>
          <div className="future-grid">
            {[{year:"2026",icon:"📍",title:"Consolidar Luanda",desc:"100 clientes HORECA. Entrega em menos de 4 horas."},{year:"2027",icon:"🚀",title:"Expansão Nacional",desc:"Operações em Benguela, Lubango e Huambo."},{year:"2028",icon:"📱",title:"App Móvel",desc:"Aplicação iOS e Android com rastreamento."},{year:"2029+",icon:"🌍",title:"Liderança CPLP",desc:"Referência B2B alimentar em África lusófona."}].map((f,i)=>(
              <div key={i} className="future-card"><div className="future-year">{f.year} · {f.icon}</div><div className="future-title">{f.title}</div><div className="future-desc">{f.desc}</div></div>
            ))}
          </div>
        </div>
      </div>
      {(partners||[]).length > 0 && (
        <div style={{background:"var(--off-white)",padding:"56px 24px",borderTop:"1px solid var(--border)"}}>
          <div style={{maxWidth:960,margin:"0 auto"}}>
            <div className="eyebrow">Parceiros</div>
            <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(20px,4vw,34px)",textAlign:"center",marginBottom:8,fontWeight:800}}>Com quem trabalhamos</h2>
            <div className="partners-grid">
              {partners.map((p,i)=>(
                <div key={p.id||i} className="partner-card">
                  <div className="partner-logo-wrap">{p.logo?<img src={p.logo} alt={p.name} onError={e=>{e.target.style.display="none"}} />:<div style={{fontSize:30,opacity:.15}}>🏢</div>}</div>
                  <div className="partner-body"><div className="partner-name">{p.name}</div><div className="partner-type">{p.type}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Footer goTo={goTo} />
    </div>
  );
}

function PageContacto({ goTo }) {
  const [form,setForm]=useState({name:"",company:"",subject:"Encomenda",message:""});
  const [sent,setSent]=useState(false);
  const submit=()=>{
    if(!form.name||!form.message)return;
    notifyWA(`📩 *Contacto via Menamart*\n\nDe: *${form.name}* (${form.company})\nAssunto: ${form.subject}\n\n${form.message}`);
    setSent(true);
  };
  return (
    <div style={{background:"var(--off-white)"}}>
      <div className="hero-wrap" style={{padding:"50px 24px 40px"}}>
        <div className="hero-badge">📞 Contacto</div>
        <h1 className="hero-title" style={{fontSize:"clamp(24px,4vw,40px)"}}>Fale connosco</h1>
      </div>
      <div className="section" style={{maxWidth:860}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            {[{icon:"💬",t:"WhatsApp",v:"+244 933 929 233"},{icon:"📧",t:"Email",v:"menamart.angola@gmail.com"},{icon:"📍",t:"Localização",v:"Rua de Benguela, São Paulo, Luanda"},{icon:"🕐",t:"Horário",v:"07:00 – 18:00 (Seg–Sex)"}].map((c,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"var(--shadow-sm)",border:"1px solid var(--border)",display:"flex",gap:11}}>
                <div style={{width:38,height:38,background:"var(--green-pale)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{c.icon}</div>
                <div><div style={{fontSize:10,fontWeight:700,color:"var(--ink-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:1}}>{c.t}</div><div style={{fontFamily:"var(--font-display)",fontSize:14,color:"var(--green)",fontWeight:700}}>{c.v}</div></div>
              </div>
            ))}
            <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="btn-wa">💬 Falar no WhatsApp</a>
          </div>
          <div style={{background:"#fff",borderRadius:13,padding:24,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
            {sent ? (<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:44,marginBottom:12}}>✅</div><div style={{fontFamily:"var(--font-display)",fontSize:20,color:"var(--green)",marginBottom:7,fontWeight:700}}>Mensagem Enviada!</div><button className="btn-green" onClick={()=>setSent(false)}>Nova Mensagem</button></div>) : (
              <>
                <div style={{fontFamily:"var(--font-display)",fontSize:19,color:"var(--ink)",marginBottom:16,paddingBottom:11,borderBottom:"1px solid var(--border)",fontWeight:700}}>Enviar Mensagem</div>
                <div style={{display:"flex",flexDirection:"column",gap:11}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                    <div className="admin-form-field"><label>Nome *</label><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
                    <div className="admin-form-field"><label>Empresa</label><input type="text" value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} /></div>
                  </div>
                  <div className="admin-form-field"><label>Assunto</label><select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>{["Encomenda","Parceria","Reclamação","Informação Geral","Outro"].map(t=><option key={t}>{t}</option>)}</select></div>
                  <div className="admin-form-field"><label>Mensagem *</label><textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={4} style={{resize:"vertical"}} /></div>
                  <button onClick={submit} className="btn-green" style={{width:"100%",padding:11,fontSize:14}}>Enviar via WhatsApp →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer goTo={goTo} />
    </div>
  );
}

// FIX #3: Login — lowercase code input, standard font sizes
function PageLogin({ clients, onLogin, onClose }) {
  const [companyName,setCompanyName]=useState("");
  const [code,setCode]=useState("");
  const [addr,setAddr]=useState("");
  const [error,setError]=useState("");
  const [step,setStep]=useState(1);
  const [found,setFound]=useState(null);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  const check=()=>{
    const name=companyName.trim().toLowerCase(),cd=code.trim().toUpperCase();
    if(!name){setError("Introduza o nome da empresa.");return;}
    if(!cd){setError("Introduza o código de acesso.");return;}
    const match=clients.find(c=>c.approved&&c.code.toUpperCase()===cd&&c.businessName.trim().toLowerCase()===name);
    if(match){setFound(match);setAddr(match.address||"");setError("");setStep(2);}
    else setError("Empresa ou código não encontrado. Registe-se via WhatsApp.");
  };
  const confirm=()=>{if(!addr.trim()){setError("Indique o endereço de entrega.");return;}onLogin({...found,address:addr.trim()});};
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style={{maxWidth:420,width:"calc(100vw - 24px)"}}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <div className="modal-head">
          <img src={LOGO_SRC} alt="Menamart" />
          <h2>{step===1?"Entrar na Plataforma":"Bem-vindo!"}</h2>
          <p>{step===1?"Acesso exclusivo para empresas verificadas":`${found?.businessName}`}</p>
        </div>
        <div className="modal-body">
          {error&&<div className="modal-error">⚠️ {error}</div>}
          {step===1&&(<>
            {/* FIX #3: Standard font size labels and inputs */}
            <div className="form-field">
              <label className="form-label">Nome da Empresa</label>
              <input className="form-input" type="text" value={companyName} onChange={e=>{setCompanyName(e.target.value);setError("");}} placeholder="Ex: Hotel Intercontinental" autoFocus onKeyDown={e=>e.key==="Enter"&&check()} />
            </div>
            <div className="form-field">
              <label className="form-label">Código de Acesso</label>
              {/* FIX #3: lowercase (no text-transform uppercase), standard size */}
              <input className="form-input code-input" type="text" value={code} onChange={e=>{setCode(e.target.value);setError("");}} placeholder="ex: mn-001" onKeyDown={e=>e.key==="Enter"&&check()} />
            </div>
            <button className="modal-submit" onClick={check}>Verificar Acesso →</button>
            <div style={{textAlign:"center",marginTop:11,fontSize:13,color:"var(--ink-muted)"}}>Não tem acesso? <a href={waLink("Olá Menamart! Gostaria de me registar.")} target="_blank" rel="noreferrer" style={{color:"var(--green)",fontWeight:700,textDecoration:"none"}}>Registar via WhatsApp</a></div>
          </>)}
          {step===2&&(<>
            <div style={{background:"var(--green-pale)",border:"1px solid var(--green-pale2)",borderRadius:9,padding:"12px 14px",marginBottom:15,display:"flex",gap:10,alignItems:"center"}}>
              <div style={{fontSize:26}}>{found?.type==="Hotel"?"🏨":found?.type==="Restaurante"?"🍽️":"🏢"}</div>
              <div><div style={{fontWeight:800,color:"var(--green)",fontSize:14}}>{found?.businessName}</div><div style={{fontSize:12,color:"var(--ink-muted)",marginTop:1}}>{found?.type} · <strong style={{fontFamily:"monospace"}}>{found?.code}</strong></div></div>
            </div>
            <div className="form-field">
              <label className="form-label">Endereço de Entrega</label>
              <input className="form-input" type="text" value={addr} onChange={e=>{setAddr(e.target.value);setError("");}} placeholder="Bairro, Município, Luanda" autoFocus onKeyDown={e=>e.key==="Enter"&&confirm()} />
            </div>
            <button className="modal-submit" onClick={confirm}>Confirmar & Entrar →</button>
            <button className="modal-back" onClick={()=>{setStep(1);setError("");}}>← Voltar</button>
          </>)}
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// BUYER CATALOG — FIX #5: Show catalog to guests but hide prices
// =============================================================================
const PAGE_SIZE = 20;

function BuyerCatalog({ products, categories, currentUser, settings, onNewOrder, goTo, onLogout, onSecretClick }) {
  const [cart,setCart]=useState([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [activeCat,setActiveCat]=useState("Todos");
  const [search,setSearch]=useState("");
  const [success,setSuccess]=useState(null);
  const [payMethod,setPayMethod]=useState(settings?.defaultMethod||"on_delivery");
  const [page,setPage]=useState(1);
  const [copied,setCopied]=useState(false);
  const [quickViewProduct,setQuickViewProduct]=useState(null);

  const creditApproved=(settings?.creditClients||[]).includes(currentUser?.id||currentUser?._id);
  const acceptedMethods=(settings?.acceptedMethods||["on_delivery"]).filter(m=>CREDIT_METHODS.includes(m)?creditApproved:true);
  const catNames=["Todos",...categories.map(c=>c.name)];

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return products.filter(p=>{
      const catOk=activeCat==="Todos"||p.category===activeCat;
      if(!q)return catOk;
      return catOk&&(p.name.toLowerCase().includes(q)||p.sub.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));
    });
  },[products,activeCat,search]);

  const totalPages=Math.ceil(filtered.length/PAGE_SIZE);
  const paginated=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartTotal=cart.reduce((s,i)=>s+i.sellingPrice*i.qty,0);
  const movPct=Math.min((cartTotal/MOV)*100,100);
  const movMet=cartTotal>=MOV;

  const addItem=p=>setCart(prev=>{const ex=prev.find(i=>i.id===p.id);return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}];});
  const changeQty=(id,delta)=>setCart(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+delta)}:i).filter(i=>i.qty>0));
  const removeItem=id=>setCart(prev=>prev.filter(i=>i.id!==id));

  const isCredit=CREDIT_METHODS.includes(payMethod);
  const creditDays=payMethod==="credit_week"?7:payMethod==="credit_month"?30:null;
  const dueDate=creditDays?new Date(Date.now()+creditDays*86400000).toLocaleDateString("pt-AO"):null;
  const selectedPay=PAYMENT_METHODS.find(m=>m.id===payMethod);

  const handleCheckout=async()=>{
    const orderId="ORD-"+String(Math.floor(Math.random()*90000)+10000);
    const order={
      id:orderId,clientId:currentUser.id||currentUser._id,clientName:currentUser.businessName,
      clientPhone:(currentUser.phone||"").replace(/\D/g,""),clientCode:currentUser.code,
      clientEmail:currentUser.email||"",total:cartTotal,address:currentUser.address,
      date:new Date().toISOString().split("T")[0],status:"Pending",paymentMethod:payMethod,
      paymentStatus:isCredit?`Crédito — vence ${dueDate}`:"Pay on Delivery",
      creditDueDate:dueDate||"",
      items:cart.map(i=>({name:i.name,qty:i.qty,price:i.sellingPrice,total:i.sellingPrice*i.qty})),
    };
    await onNewOrder(order);
    // FIX #6: Gmail notification
    sendGmailNotification(order);
    setSuccess({id:orderId,total:cartTotal,payMethod,dueDate});
    setCart([]);setCartOpen(false);
  };

  const copyOrderCode=code=>{navigator.clipboard.writeText(code).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}).catch(()=>{});};
  useEffect(()=>{if(!cartOpen)return;const h=e=>{if(e.key==="Escape")setCartOpen(false);};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[cartOpen]);
  useEffect(()=>setPage(1),[activeCat,search]);

  return (
    <>
      <NavBar page="catalog" goTo={goTo} currentUser={currentUser} cartCount={cartCount} onCartOpen={()=>currentUser&&setCartOpen(true)} onSearch={setSearch} searchValue={search} />

      <div style={{background:"var(--off-white)",paddingBottom:70}}>
        {/* FIX #5: Guest banner */}
        {!currentUser && (
          <div style={{background:"#0c1a0c",padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,.07)",textAlign:"center"}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>🔐 Faça login para ver preços e encomendar · </span>
            <span style={{fontSize:13,color:"#7dd87d",cursor:"pointer",fontWeight:700}} onClick={()=>goTo("login")}>Entrar →</span>
            <span style={{fontSize:13,color:"rgba(255,255,255,.4)"}}> ou </span>
            <a href={waLink("Olá Menamart! Gostaria de me registar.")} target="_blank" rel="noreferrer" style={{fontSize:13,color:"#ff8040",fontWeight:700,textDecoration:"none"}}>Registar via WhatsApp</a>
          </div>
        )}

        {/* Category pills */}
        <div style={{background:"#fff",borderBottom:"1px solid var(--border)",padding:"10px 16px",overflowX:"auto",whiteSpace:"nowrap"}}>
          <div style={{display:"flex",gap:7,paddingBottom:2}}>
            {catNames.map(c=>(
              <button key={c} className={`pill${activeCat===c?" active":""}`} onClick={()=>setActiveCat(c)} style={{flexShrink:0}}>{c}</button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div style={{padding:"16px 16px 0",maxWidth:1200,margin:"0 auto"}}>
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"48px 0",color:"var(--ink-muted)"}}>
              <div style={{fontSize:42,marginBottom:9}}>🔍</div>
              <div style={{fontWeight:700,marginBottom:6}}>Nenhum produto encontrado</div>
              <span style={{color:"var(--green)",cursor:"pointer",fontWeight:700}} onClick={()=>{setSearch("");setActiveCat("Todos");}}>Limpar pesquisa</span>
            </div>
          ):(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
                <div style={{fontSize:12,color:"var(--ink-muted)"}}>{filtered.length} produto{filtered.length!==1?"s":""}{activeCat!=="Todos"?` em ${activeCat}`:""}{totalPages>1&&` · Página ${page}/${totalPages}`}</div>
              </div>
              <div className="prod-grid">
                {paginated.map(p=>(
                  <ProductCard key={p.id} product={p} cartItem={cart.find(i=>i.id===p.id)}
                    onAdd={addItem} onChangeQty={changeQty}
                    onQuickView={setQuickViewProduct}
                    currentUser={currentUser}
                    isAdmin={false}
                  />
                ))}
              </div>
              {totalPages>1&&(
                <div className="pagination">
                  <button className="page-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Anterior</button>
                  {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
                    let p;
                    if(totalPages<=7)p=i+1;
                    else if(page<=4)p=i+1;
                    else if(page>=totalPages-3)p=totalPages-6+i;
                    else p=page-3+i;
                    return p>=1&&p<=totalPages?<button key={p} className={`page-btn${page===p?" active":""}`} onClick={()=>setPage(p)}>{p}</button>:null;
                  })}
                  <button className="page-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Próxima →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom bar */}
      {cartCount>0&&currentUser&&(
        <div className="mobile-bottom-bar">
          <div><div className="mobile-bottom-bar-total">{fmt(cartTotal)}</div><div className="mobile-bottom-bar-items">{cartCount} item{cartCount!==1?"s":""}</div></div>
          <button className="mobile-bottom-bar-btn" onClick={()=>setCartOpen(true)}>🛒 Ver Cesto</button>
        </div>
      )}

      {cartCount>0&&!cartOpen&&currentUser&&(
        <button className="float-cart" onClick={()=>setCartOpen(true)}>
          🛒 {cartCount} {cartCount===1?"item":"itens"} · {fmt(cartTotal)}
        </button>
      )}

      {/* CART PANEL */}
      {cartOpen&&currentUser&&(
        <>
          <div className="cart-overlay" onClick={()=>setCartOpen(false)} />
          <div className="cart-panel">
            <div className="cart-head">
              <span className="cart-head-title">Cesto {cartCount>0&&<span className="cart-badge">{cartCount}</span>}</span>
              <button className="cart-close-btn" onClick={()=>setCartOpen(false)}>✕</button>
            </div>
            {cart.length===0?(
              <div className="cart-empty-state"><div style={{fontSize:40,opacity:.18}}>🛒</div><div style={{fontWeight:700}}>Cesto vazio</div></div>
            ):(
              <div className="cart-items-scroll">
                {cart.map(item=>(
                  <div key={item.id} className="cart-row">
                    <img className="cart-row-img" src={item.img} alt={item.name} onError={e=>{e.target.style.display="none";}} />
                    <div><div className="cart-row-name">{item.name}</div><div className="cart-row-unit">{fmt(item.sellingPrice)} / un.</div></div>
                    <div className="cart-row-qty-ctrl">
                      <button className="cqb" onClick={()=>changeQty(item.id,-1)}>−</button>
                      <input type="number" min="1" value={item.qty} onChange={e=>{const v=parseInt(e.target.value);if(!isNaN(v)&&v>0)changeQty(item.id,v-item.qty);}} style={{width:36,textAlign:"center",border:"1px solid var(--border)",borderRadius:6,fontWeight:800,fontSize:13,padding:"2px 0",outline:"none"}} />
                      <button className="cqb" onClick={()=>changeQty(item.id,1)}>+</button>
                    </div>
                    <div className="cart-row-line">{fmt(item.sellingPrice*item.qty)}</div>
                    <button className="cart-row-del" onClick={()=>removeItem(item.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="cart-footer">
              <div className="mov-bar-wrap">
                <div className="mov-bar-labels"><span>Mínimo</span><strong style={{fontFamily:"var(--font-display)",fontSize:13}}>{fmt(MOV)}</strong></div>
                <div className="mov-bar-track"><div className="mov-bar-fill" style={{width:`${movPct}%`}} /></div>
                <div className={`mov-bar-msg${movMet?" met":""}`}>{movMet?"✓ Mínimo atingido!":`Faltam ${fmt(MOV-cartTotal)}`}</div>
              </div>
              <div className="cart-total-row"><span className="cart-total-label">Total</span><span className="cart-total-val">{fmt(cartTotal)}</span></div>
              {movMet&&cart.length>0&&(
                <div>
                  <div className="pay-section-label">Pagamento</div>
                  <div className="pay-chips">
                    {PAYMENT_METHODS.filter(m=>acceptedMethods.includes(m.id)).map(m=>{const isC=CREDIT_METHODS.includes(m.id);return(<button key={m.id} className={`pay-chip${isC?" credit-chip":""}${payMethod===m.id?" sel":""}`} onClick={()=>setPayMethod(m.id)}>{m.icon} {m.label}</button>);})}
                  </div>
                  {payMethod==="bank_transfer"&&(settings?.banks||[]).length>0&&<div className="pay-info" style={{marginTop:8}}>{settings.banks.map(b=><div key={b.id}>🏦 <strong>{b.bankName}</strong>{b.iban&&<> · <span style={{fontFamily:"monospace",fontSize:11}}>{b.iban}</span></>}</div>)}</div>}
                  {payMethod==="multicaixa"&&<div className="pay-info" style={{marginTop:8,background:"#fff7ed"}}>📱 <strong>{settings?.multicaixaRef}</strong></div>}
                  {isCredit&&<div className="pay-info" style={{marginTop:8,background:"#faf5ff",color:"#5b21b6"}}>📅 Vence em <strong>{dueDate}</strong></div>}
                </div>
              )}
              <div className="cart-delivery-note"><span>🚚</span><span>Entrega: <strong>{currentUser.address}</strong></span></div>
              <button className={`cart-checkout-btn${!movMet||!cart.length?" not-ready":" ready"}`} onClick={movMet&&cart.length?handleCheckout:undefined} disabled={!movMet||!cart.length}>
                {!movMet?`Mínimo: ${fmt(MOV)}`:`Confirmar · ${selectedPay?.icon} ${selectedPay?.label}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* SUCCESS MODAL */}
      {success&&(
        <div className="modal-overlay">
          <div className="success-modal">
            <button className="modal-x dark" onClick={()=>setSuccess(null)}>✕</button>
            <div className="success-icon">✅</div>
            <div className="success-title">Encomenda Confirmada!</div>
            <div className="success-sub">A sua encomenda foi registada. A equipa Menamart irá contactá-lo em breve.</div>
            <div className="order-code-box">
              <div className="order-code-label">Código da encomenda</div>
              <div className="order-code-value">{success.id}</div>
              <button className="order-code-copy-btn" onClick={()=>copyOrderCode(success.id)}>{copied?"✅ Copiado!":"📋 Copiar"}</button>
            </div>
            {isCredit&&<div className="pay-info" style={{textAlign:"left",marginBottom:12,background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:9,padding:"10px 14px",fontSize:13,color:"#5b21b6"}}>📅 Prazo: <strong>{success.dueDate}</strong></div>}
            <button className="btn-green" style={{width:"100%",padding:12,fontSize:14}} onClick={()=>setSuccess(null)}>Continuar a Encomendar</button>
          </div>
        </div>
      )}

      {/* FIX #2: Quick View Modal */}
      {quickViewProduct&&(
        <QuickViewModal
          product={quickViewProduct}
          currentUser={currentUser}
          onAdd={addItem}
          onClose={()=>setQuickViewProduct(null)}
          cartItem={cart.find(i=>i.id===quickViewProduct.id)}
          onChangeQty={changeQty}
        />
      )}

      <Footer goTo={goTo} onSecretClick={onSecretClick} />
    </>
  );
}


// =============================================================================
// CLIENT ACCOUNT
// =============================================================================
function ClientAccount({ currentUser, setCurrentUser, orders, goTo, onLogout, onSecretClick }) {
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({businessName:currentUser.businessName,contact:currentUser.contact,phone:currentUser.phone||"",email:currentUser.email||"",address:currentUser.address||""});
  const myOrders=orders.filter(o=>o.clientId===(currentUser.id||currentUser._id)||o.clientCode===currentUser.code);
  const totalSpent=myOrders.reduce((s,o)=>s+o.total,0);
  const save=async()=>{
    try{await updDoc("clients",currentUser.id||currentUser._id,form);}catch(e){console.error(e);}
    setCurrentUser(u=>({...u,...form}));setEditing(false);
  };
  return (
    <div style={{background:"var(--off-white)",minHeight:"60vh"}}>
      <NavBar page="account" goTo={goTo} currentUser={currentUser} onCartOpen={()=>{}} onLogout={onLogout} />
      <div style={{background:"var(--green-dark)",padding:"36px 24px 28px"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:"clamp(17px,4vw,28px)",color:"#fff",marginBottom:9,fontWeight:800}}>{currentUser.businessName}</h1>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{[`🔑 ${currentUser.code}`,`📦 ${myOrders.length} encomendas`,`💰 ${fmt(totalSpent)}`].map((t,i)=><span key={i} style={{background:"rgba(255,255,255,.1)",borderRadius:100,padding:"4px 12px",fontSize:12,fontWeight:500,color:"rgba(255,255,255,.7)"}}>{t}</span>)}</div>
        </div>
      </div>
      <div className="section" style={{maxWidth:900}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:20,alignItems:"start"}}>
          <div style={{background:"#fff",borderRadius:13,padding:20,boxShadow:"var(--shadow-sm)",border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13,paddingBottom:10,borderBottom:"1px solid var(--border)"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700}}>Dados da Empresa</div>
              {!editing&&<button className="btn-sm btn-gray" onClick={()=>setEditing(true)}>✏️ Editar</button>}
            </div>
            {editing?(<div style={{display:"flex",flexDirection:"column",gap:10}}>{[["Nome","businessName"],["Responsável","contact"],["Telefone","phone"],["Email","email"],["Endereço","address"]].map(([l,k])=>(<div key={k}><label className="form-label">{l}</label><input type="text" className="form-input" value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} /></div>))}<div style={{display:"flex",gap:7}}><button className="btn-green" style={{flex:1,padding:8}} onClick={save}>✅ Guardar</button><button className="btn-sm btn-gray" style={{padding:"8px 13px"}} onClick={()=>setEditing(false)}>Cancelar</button></div></div>):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>{[["🏢","Empresa",currentUser.businessName],["👤","Responsável",currentUser.contact],["📱","Telefone",currentUser.phone],["📧","Email",currentUser.email||"—"],["📍","Entrega",currentUser.address]].map(([icon,label,value],i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid var(--off-white)"}}><span style={{fontSize:14,flexShrink:0}}>{icon}</span><div><div style={{fontSize:9,fontWeight:700,color:"var(--ink-muted)",textTransform:"uppercase",letterSpacing:".08em"}}>{label}</div><div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginTop:1}}>{value}</div></div></div>
              ))}</div>
            )}
            <div style={{marginTop:14,background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:10,padding:"11px 14px",textAlign:"center"}}><div style={{fontSize:10,fontWeight:700,color:"#92400E",marginBottom:4,textTransform:"uppercase",letterSpacing:".08em"}}>Código de acesso</div><div style={{fontFamily:"monospace",fontSize:20,fontWeight:900,color:"#78350F",letterSpacing:".12em"}}>{currentUser.code}</div></div>
          </div>
          <div style={{background:"#fff",borderRadius:13,padding:20,boxShadow:"var(--shadow-sm)",border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13,paddingBottom:10,borderBottom:"1px solid var(--border)"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700}}>Histórico de Encomendas</div>
              <span style={{fontFamily:"var(--font-display)",fontSize:14,color:"var(--green)",fontWeight:700}}>{fmt(totalSpent)}</span>
            </div>
            {myOrders.length===0?(<div style={{textAlign:"center",padding:"24px 0",color:"var(--ink-muted)"}}><div style={{fontSize:36,marginBottom:8}}>📦</div><div style={{fontWeight:700,marginBottom:10}}>Ainda sem encomendas</div><button className="btn-green" onClick={()=>goTo("catalog")}>Ir ao Catálogo →</button></div>):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>{myOrders.map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);return(<div key={o.id} style={{background:"var(--off-white)",borderRadius:8,padding:"10px 12px",border:"1px solid var(--border)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><strong style={{fontFamily:"monospace",color:"var(--ink)",fontSize:12}}>{o.id}</strong><span style={{background:`${c}18`,color:c,padding:"2px 8px",borderRadius:100,fontSize:11,fontWeight:700}}>{o.status}</span></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"var(--ink-muted)"}}>{o.date}{pm&&` · ${pm.icon} ${pm.label}`}</span><span style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:13,fontWeight:700}}>{fmt(o.total)}</span></div></div>);})}
            </div>
            )}
          </div>
        </div>
      </div>
      <Footer goTo={goTo} onSecretClick={onSecretClick} />
    </div>
  );
}

// =============================================================================
// ADMIN — FIX #1: Edit/Delete with confirmation for products
// =============================================================================
function AdminDashboard({ products, orders, clients, feedbacks }) {
  const revenue=orders.filter(o=>o.status==="Delivered").reduce((s,o)=>s+o.total,0);
  const pending=orders.filter(o=>o.status==="Pending").length;
  const creditOrders=orders.filter(o=>CREDIT_METHODS.includes(o.paymentMethod));
  const newFeedbacks=feedbacks.filter(f=>f.status==="Novo").length;
  const deleteOrder=async id=>{if(window.confirm("Apagar esta encomenda?"))try{await delDoc("orders",id);}catch(e){console.error(e);}};
  return (
    <div>
      <div className="admin-title">Painel de Controlo</div>
      <div className="admin-sub">Menamart v{APP_VERSION} · Firebase · © 2026</div>
      <div className="stats-row">
        {[{icon:"💰",v:fmt(revenue),l:"Receita Total",n:"Entregues"},{icon:"🛒",v:orders.length,l:"Encomendas",n:`${pending} pendentes`},{icon:"👥",v:clients.length,l:"Clientes",n:"Verificados"},{icon:"📦",v:products.filter(p=>p.stock).length,l:"Em Stock",n:`${products.filter(p=>!p.stock).length} esgotados`},{icon:"📅",v:creditOrders.length,l:"Crédito",n:""},{icon:"💡",v:newFeedbacks,l:"Sugestões",n:"Novas"}].map((s,i)=>(
          <div key={i} className="stat-card"><div className="stat-icon">{s.icon}</div><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div><div className="stat-note">{s.n}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Encomendas Recentes</div></div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Estado</th><th>Data</th><th></th></tr></thead>
            <tbody>{orders.slice(0,12).map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);const isC=CREDIT_METHODS.includes(o.paymentMethod);return(<tr key={o.id}><td><strong style={{fontFamily:"monospace"}}>{o.id}</strong></td><td style={{fontWeight:700}}>{o.clientName}</td><td style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:14,fontWeight:700}}>{fmt(o.total)}</td><td><span className={`tag${isC?" tag-credit":""}`}>{pm?`${pm.icon} ${pm.label}`:"—"}</span></td><td><span className="status-badge" style={{background:`${c}18`,color:c}}><span className="status-dot" style={{background:c}} />{o.status}</span></td><td style={{fontSize:12}}>{o.date}</td><td><button className="btn-sm btn-red" onClick={()=>deleteOrder(o.id)}>🗑️</button></td></tr>);})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// FIX #1: Admin Products with inline Edit/Delete and confirmation
function AdminProducts({ products, categories }) {
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [quickViewProduct,setQuickViewProduct]=useState(null);
  const defCat=categories.length>0?categories[0].name:"";
  const empty={name:"",sub:"",category:defCat,costPrice:"",sellingPrice:"",img:"",stock:true,desc:""};
  const [form,setForm]=useState(empty);
  const [saving,setSaving]=useState(false);
  const [calc,setCalc]=useState({cost:"",pct:""});
  const calcResult=calc.cost&&calc.pct?parseFloat(calc.cost)*(1+parseFloat(calc.pct)/100):null;
  const openNew=()=>{setForm({...empty,category:defCat});setEditId(null);setShowForm(true);};
  const openEdit=p=>{setForm({name:p.name,sub:p.sub,category:p.category,costPrice:p.costPrice,sellingPrice:p.sellingPrice,img:p.img||"",stock:p.stock,desc:p.desc||""});setEditId(p.id);setShowForm(true);};
  const save=async()=>{
    if(!form.name||!form.sellingPrice)return;
    setSaving(true);
    const entry={...form,sellingPrice:parseFloat(form.sellingPrice),costPrice:parseFloat(form.costPrice||0)};
    try{
      if(editId)await setDoc(doc(db,"products",String(editId)),{...entry,id:editId});
      else{const id=genId();await setDoc(doc(db,"products",id),{...entry,id});}
    }catch(e){console.error(e);}
    setSaving(false);setShowForm(false);setEditId(null);
  };
  // FIX #1: Delete with confirmation popup
  const remove=async p=>{
    if(window.confirm(`⚠️ Apagar "${p.name}"?\n\nEsta acção não pode ser desfeita.`))
      try{await delDoc("products",p.id);}catch(e){console.error(e);}
  };
  const toggleStock=async p=>{try{await setDoc(doc(db,"products",String(p.id)),{...p,stock:!p.stock});}catch(e){console.error(e);}};
  return (
    <div>
      <div className="admin-title">Gestão de Produtos</div>
      <div className="admin-sub">Alterações guardadas automaticamente no Firebase.</div>
      <div className="margin-calc">
        <div className="margin-calc-title">🧮 Calculadora de Margem</div>
        <div className="margin-calc-grid">
          <div className="margin-input-field"><label>Custo (AKZ)</label><input type="number" value={calc.cost} onChange={e=>setCalc(c=>({...c,cost:e.target.value}))} /></div>
          <div className="margin-input-field"><label>Margem (%)</label><input type="number" value={calc.pct} onChange={e=>setCalc(c=>({...c,pct:e.target.value}))} /></div>
          <div className="margin-input-field"><label>Preço Sugerido</label><input readOnly value={calcResult?Math.round(calcResult).toLocaleString("pt-AO"):""} placeholder="—" style={{color:"#a8e6a8",fontWeight:800}} /></div>
        </div>
        {calcResult&&<div className="margin-result"><span className="margin-result-label">Preço sugerido</span><span className="margin-result-value">{fmt(calcResult)}</span></div>}
      </div>
      {showForm&&(
        <div className="form-section">
          <div className="form-section-title">{editId?"✏️ Editar Produto":"➕ Novo Produto"}</div>
          <div className="admin-form-grid">
            <div className="admin-form-field admin-form-full"><label>Nome *</label><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Sub-título / Embalagem</label><input type="text" value={form.sub} onChange={e=>setForm(f=>({...f,sub:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Categoria</label><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{categories.map(c=><option key={c.id||c.name}>{c.name}</option>)}</select></div>
            <div className="admin-form-field"><label>Custo (AKZ)</label><input type="number" value={form.costPrice} onChange={e=>setForm(f=>({...f,costPrice:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Preço de Venda (AKZ) *</label><input type="number" value={form.sellingPrice} onChange={e=>setForm(f=>({...f,sellingPrice:e.target.value}))} /></div>
            <div className="admin-form-field admin-form-full"><label>Descrição</label><textarea value={form.desc||""} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} rows={2} style={{resize:"vertical"}} /></div>
            <div className="admin-form-field admin-form-full"><PhotoUpload value={form.img} onChange={v=>setForm(f=>({...f,img:v}))} label="Foto do Produto" /></div>
          </div>
          <div style={{display:"flex",gap:9,marginTop:14,alignItems:"center"}}>
            <button className="btn-green" onClick={save} disabled={saving}>{saving?"A guardar...":editId?"✅ Guardar":"➕ Adicionar"}</button>
            <button className="btn-sm btn-gray" style={{padding:"9px 16px"}} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button>
            <label style={{display:"flex",alignItems:"center",gap:7,marginLeft:"auto",cursor:"pointer",fontSize:13}}>
              <span className="toggle"><input type="checkbox" checked={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.checked}))} /><span className="toggle-slider" /></span>
              {form.stock?"Em Stock":"Esgotado"}
            </label>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header"><div className="card-title">Catálogo ({products.length} produtos)</div><button className="btn-green btn-sm" onClick={openNew}>+ Novo Produto</button></div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>Produto</th><th>Categoria</th><th>Custo</th><th>Venda</th><th>Margem</th><th>Stock</th><th>Acções</th></tr></thead>
            <tbody>{products.map(p=>{const margin=p.costPrice>0?(((p.sellingPrice-p.costPrice)/p.costPrice)*100).toFixed(0):null;return(
              <tr key={p.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:9}}>
                  <img src={p.img} alt="" style={{width:36,height:36,borderRadius:6,objectFit:"cover",background:"var(--gray)",cursor:"pointer"}} onError={e=>{e.target.style.display="none";}} onClick={()=>setQuickViewProduct(p)} />
                  <div><div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{p.sub}</div></div>
                </div></td>
                <td><span className="tag">{p.category}</span></td>
                <td style={{fontSize:12,color:"var(--ink-muted)"}}>{fmt(p.costPrice)}</td>
                <td style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:700}}>{fmt(p.sellingPrice)}</td>
                <td><span style={{color:"var(--green)",fontWeight:700}}>{margin?`+${margin}%`:"—"}</span></td>
                <td><label className="toggle"><input type="checkbox" checked={p.stock} onChange={()=>toggleStock(p)} /><span className="toggle-slider" /></label></td>
                {/* FIX #1: Edit and Delete buttons */}
                <td><div style={{display:"flex",gap:5}}>
                  <button className="btn-sm btn-gray" onClick={()=>openEdit(p)}>✏️ Editar</button>
                  <button className="btn-sm btn-red" onClick={()=>remove(p)}>🗑️ Apagar</button>
                </div></td>
              </tr>
            );})}</tbody>
          </table>
        </div>
      </div>
      {quickViewProduct&&<QuickViewModal product={quickViewProduct} currentUser={{businessName:"Admin"}} onAdd={()=>{}} onClose={()=>setQuickViewProduct(null)} cartItem={null} onChangeQty={()=>{}} />}
    </div>
  );
}

function AdminClients({ clients, orders, settings, setSettings }) {
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [showOrders,setShowOrders]=useState(null);
  const [invoiceOrder,setInvoiceOrder]=useState(null);
  const [saving,setSaving]=useState(false);
  const empty={businessName:"",type:"Restaurante",contact:"",phone:"",email:"",nif:"",address:"",code:""};
  const [form,setForm]=useState(empty);
  const creditClients=settings?.creditClients||[];
  const nextCode=()=>{const nums=clients.map(c=>parseInt(c.code.replace(/\D/g,""))||0);return"MN-"+String((nums.length>0?Math.max(...nums):0)+1).padStart(3,"0");};
  const openNew=()=>{setForm({...empty,code:nextCode()});setEditId(null);setShowForm(true);};
  const openEdit=c=>{setForm({businessName:c.businessName,type:c.type,contact:c.contact,phone:c.phone||"",email:c.email||"",nif:c.nif||"",address:c.address||"",code:c.code});setEditId(c.id||c._id);setShowForm(true);};
  const save=async()=>{
    if(!form.businessName||!form.contact||!form.code)return;
    setSaving(true);
    try{
      if(editId)await setDoc(doc(db,"clients",String(editId)),{...form,approved:true});
      else{const id=genId();await setDoc(doc(db,"clients",id),{...form,id,approved:true});}
    }catch(e){console.error(e);}
    setSaving(false);setShowForm(false);setEditId(null);
  };
  const remove=async(c)=>{
    if(window.confirm(`Remover cliente "${c.businessName}"?`))
      try{await delDoc("clients",c.id||c._id);}catch(e){console.error(e);}
  };
  const clientTotal=id=>orders.filter(o=>o.clientId===id||o.clientCode===clients.find(c=>(c.id||c._id)===id)?.code).reduce((s,o)=>s+o.total,0);
  const clientOrders=id=>orders.filter(o=>o.clientId===id||o.clientCode===clients.find(c=>(c.id||c._id)===id)?.code);
  const toggleCredit=async clientId=>{
    const current=settings?.creditClients||[];
    const updated=current.includes(clientId)?current.filter(id=>id!==clientId):[...current,clientId];
    try{await setDoc(doc(db,"settings","main"),{...settings,creditClients:updated});}catch(e){console.error(e);}
  };
  const sendWelcome=c=>{const phone=(c.phone||"").replace(/\D/g,"");window.open(waLink(`✅ *Bem-vindo à Menamart!*\n\nOlá *${c.contact}* (${c.businessName})!\n\n🔑 Código: \`${c.code}\`\n\n_Equipa Menamart_`,phone||WA_NUMBER),"_blank");};
  const activeClient=showOrders?clients.find(c=>(c.id||c._id)===showOrders):null;
  const activeOrders=showOrders?clientOrders(showOrders):[];
  return (
    <div>
      <div className="admin-title">Gestão de Clientes</div>
      {showForm&&(
        <div className="form-section">
          <div className="form-section-title">{editId?"✏️ Editar Cliente":"➕ Novo Cliente"}</div>
          <div className="admin-form-grid">
            <div className="admin-form-field admin-form-full"><label>Nome da Empresa *</label><input type="text" value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Tipo</label><select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{["Restaurante","Hotel","Catering","Café","Supermercado","Outro"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="admin-form-field"><label>Código *</label><input type="text" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} style={{fontFamily:"monospace",fontWeight:900,color:"var(--green)",fontSize:15}} /></div>
            <div className="admin-form-field"><label>Responsável *</label><input type="text" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} /></div>
            <div className="admin-form-field"><label>NIF</label><input type="text" value={form.nif} onChange={e=>setForm(f=>({...f,nif:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Telefone</label><input type="text" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Email</label><input type="text" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div className="admin-form-field admin-form-full"><label>Endereço</label><input type="text" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
          </div>
          <div style={{display:"flex",gap:9,marginTop:13}}>
            <button className="btn-green" onClick={save} disabled={saving}>{saving?"A guardar...":editId?"Guardar":"Adicionar"}</button>
            <button className="btn-sm btn-gray" style={{padding:"9px 16px"}} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}
      {showOrders&&activeClient&&(
        <div className="form-section">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:11,borderBottom:"1px solid var(--border)"}}>
            <div><div className="form-section-title" style={{marginBottom:1}}>📦 {activeClient.businessName}</div><div style={{fontSize:12,color:"var(--ink-muted)"}}>Total: <strong style={{color:"var(--green)"}}>{fmt(clientTotal(showOrders))}</strong></div></div>
            <button className="btn-sm btn-gray" onClick={()=>setShowOrders(null)}>✕ Fechar</button>
          </div>
          {activeOrders.length===0?(<div style={{textAlign:"center",padding:"20px",color:"var(--ink-muted)"}}><div style={{fontSize:30,marginBottom:7}}>📦</div>Nenhuma encomenda ainda</div>):(
            <div style={{overflowX:"auto"}}>
              <table>
                <thead><tr><th>ID</th><th>Data</th><th>Pagamento</th><th>Total</th><th>Estado</th><th>Factura</th></tr></thead>
                <tbody>{activeOrders.map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);const isC=CREDIT_METHODS.includes(o.paymentMethod);return(<tr key={o.id}><td><strong style={{fontFamily:"monospace"}}>{o.id}</strong></td><td style={{fontSize:12}}>{o.date}</td><td><span className={`tag${isC?" tag-credit":""}`}>{pm?`${pm.icon} ${pm.label}`:"—"}</span></td><td style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:13,fontWeight:700}}>{fmt(o.total)}</td><td><span className="status-badge" style={{background:`${c}18`,color:c}}>{o.status}</span></td><td><button className="btn-sm btn-gray" onClick={()=>setInvoiceOrder(o)}>🧾</button></td></tr>);})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="card">
        <div className="card-header"><div className="card-title">Clientes ({clients.length})</div><button className="btn-green btn-sm" onClick={openNew}>+ Novo</button></div>
        {clients.length===0?(<div style={{padding:"40px 24px",textAlign:"center",color:"var(--ink-muted)"}}><div style={{fontSize:40,marginBottom:9}}>👥</div><div style={{fontWeight:700,marginBottom:7}}>Ainda sem clientes</div><button className="btn-green" onClick={openNew}>+ Registar Primeiro Cliente</button></div>):(
          <div style={{overflowX:"auto"}}>
            <table>
              <thead><tr><th>Código</th><th>Empresa</th><th>Tipo</th><th>Contacto</th><th>Total</th><th>Crédito</th><th>Acções</th></tr></thead>
              <tbody>{clients.map(c=>{const id=c.id||c._id;const hasCredit=creditClients.includes(id);return(
                <tr key={id}>
                  <td><div style={{background:"var(--green-pale)",border:"1.5px solid var(--green-light)",borderRadius:7,padding:"4px 9px",textAlign:"center",display:"inline-block"}}><div style={{fontFamily:"monospace",color:"var(--green)",fontSize:13,fontWeight:900}}>{c.code}</div></div></td>
                  <td><div style={{fontWeight:700,fontSize:13}}>{c.businessName}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{c.phone}</div></td>
                  <td><span className="tag">{c.type}</span></td>
                  <td style={{fontWeight:600,fontSize:13}}>{c.contact}</td>
                  <td><div style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:13,fontWeight:700}}>{fmt(clientTotal(id))}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{clientOrders(id).length} enc.</div></td>
                  <td><label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><span className="toggle"><input type="checkbox" checked={hasCredit} onChange={()=>toggleCredit(id)} /><span className="toggle-slider" /></span><span style={{fontSize:11,fontWeight:700,color:hasCredit?"#5b21b6":"var(--ink-muted)"}}>{hasCredit?"Activo":"Off"}</span></label></td>
                  <td><div style={{display:"flex",gap:4}}>
                    <button className="btn-sm" style={{background:"#3B82F6",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}} onClick={()=>setShowOrders(showOrders===id?null:id)}>📦</button>
                    <button className="btn-sm" style={{background:"#25D366",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}} onClick={()=>sendWelcome(c)}>💬</button>
                    <button className="btn-sm btn-gray" onClick={()=>openEdit(c)}>✏️</button>
                    <button className="btn-sm btn-red" onClick={()=>remove(c)}>🗑️</button>
                  </div></td>
                </tr>
              );})}</tbody>
            </table>
          </div>
        )}
      </div>
      {invoiceOrder&&<InvoiceModal order={invoiceOrder} onClose={()=>setInvoiceOrder(null)} />}
    </div>
  );
}

function AdminOrders({ orders, clients, settings }) {
  const [filter,setFilter]=useState("All");
  const [invoiceOrder,setInvoiceOrder]=useState(null);
  const [search,setSearch]=useState("");
  const base=filter==="All"?orders:orders.filter(o=>o.status===filter);
  const shown=search.trim()?base.filter(o=>o.id.toLowerCase().includes(search.trim().toLowerCase())||o.clientName.toLowerCase().includes(search.trim().toLowerCase())):base;
  const getPhone=order=>{const c=clients.find(cl=>(cl.id||cl._id)===order.clientId||cl.code===order.clientCode);return(c?.phone||order.clientPhone||"").replace(/\D/g,"")||WA_NUMBER;};
  const updateStatus=async(id,status)=>{try{await updDoc("orders",id,{status});}catch(e){console.error(e);}};
  const deleteOrder=async id=>{if(window.confirm("Apagar esta encomenda?"))try{await delDoc("orders",id);}catch(e){console.error(e);}};
  const sendConfirm=order=>{const pm=PAYMENT_METHODS.find(m=>m.id===order.paymentMethod);window.open(waLink(`✅ *Encomenda Confirmada — Menamart*\n\nOlá *${order.clientName}*!\n📦 ID: ${order.id}\n💰 Total: ${fmt(order.total)}\n${pm?`💳 ${pm.label}\n`:""}\n_Equipa Menamart_`,getPhone(order)),"_blank");};
  return (
    <div>
      <div className="admin-title">Gestão de Encomendas</div>
      <div style={{display:"flex",maxWidth:400,background:"#fff",borderRadius:9,overflow:"hidden",border:"1.5px solid var(--border)",marginBottom:14}}>
        <input style={{flex:1,padding:"9px 14px",border:"none",fontSize:13,outline:"none",color:"var(--ink)"}} placeholder="🔍 Pesquisar por código ou cliente..." value={search} onChange={e=>setSearch(e.target.value)} />
        {search&&<button style={{background:"none",border:"none",padding:"0 12px",cursor:"pointer",color:"var(--ink-muted)",fontSize:13}} onClick={()=>setSearch("")}>✕</button>}
      </div>
      <div className="pills" style={{marginBottom:14}}>{["All",...STATUS_FLOW].map(s=><button key={s} className={`pill${filter===s?" active":""}`} onClick={()=>setFilter(s)}>{s==="All"?"Todas":s}</button>)}</div>
      <div className="card">
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Estado</th><th>Data</th><th>Acções</th></tr></thead>
            <tbody>{shown.map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);const isC=CREDIT_METHODS.includes(o.paymentMethod);return(
              <tr key={o.id}>
                <td><strong style={{fontFamily:"monospace"}}>{o.id}</strong></td>
                <td><div style={{fontWeight:700,fontSize:13}}>{o.clientName}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{o.clientCode}</div></td>
                <td style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:14,fontWeight:700}}>{fmt(o.total)}</td>
                <td><span className={`tag${isC?" tag-credit":""}`}>{pm?`${pm.icon} ${pm.label}`:"—"}</span></td>
                <td><select className="status-select" value={o.status} onChange={e=>updateStatus(o.id,e.target.value)} style={{borderColor:`${c}80`,color:c,background:`${c}12`}}>{STATUS_FLOW.map(s=><option key={s}>{s}</option>)}</select></td>
                <td style={{fontSize:12}}>{o.date}</td>
                <td><div style={{display:"flex",gap:3}}>
                  <button className="btn-sm" style={{background:"#25D366",color:"#fff",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:11}} onClick={()=>sendConfirm(o)}>✅</button>
                  <button className="btn-sm" style={{background:"#8B5CF6",color:"#fff",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:11}} onClick={()=>updateStatus(o.id,"Out for Delivery")}>🚚</button>
                  <button className="btn-sm btn-gray" onClick={()=>setInvoiceOrder(o)}>🧾</button>
                  <button className="btn-sm btn-red" onClick={()=>deleteOrder(o.id)}>🗑️</button>
                </div></td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
      </div>
      {invoiceOrder&&<InvoiceModal order={invoiceOrder} onClose={()=>setInvoiceOrder(null)} />}
    </div>
  );
}

function AdminPartners({ partners }) {
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const empty={name:"",type:"",logo:"",desc:""};
  const [form,setForm]=useState(empty);
  const [saving,setSaving]=useState(false);
  const save=async()=>{
    if(!form.name)return;setSaving(true);
    try{
      if(editId)await setDoc(doc(db,"partners",String(editId)),{...form,id:editId});
      else{const id=genId();await setDoc(doc(db,"partners",id),{...form,id});}
    }catch(e){console.error(e);}
    setSaving(false);setShowForm(false);setEditId(null);
  };
  const remove=async p=>{if(window.confirm(`Remover parceiro "${p.name}"?`))try{await delDoc("partners",p.id||p._id);}catch(e){console.error(e);}};
  return (
    <div>
      <div className="admin-title">Parceiros & Fornecedores</div>
      {showForm&&(
        <div className="form-section">
          <div className="form-section-title">{editId?"✏️ Editar":"➕ Novo Parceiro"}</div>
          <div className="admin-form-grid">
            <div className="admin-form-field"><label>Nome *</label><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Tipo</label><input type="text" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} /></div>
            <div className="admin-form-field admin-form-full"><label>Descrição</label><input type="text" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} /></div>
            <div className="admin-form-field admin-form-full"><PhotoUpload value={form.logo} onChange={v=>setForm(f=>({...f,logo:v}))} label="Logo" /></div>
          </div>
          <div style={{display:"flex",gap:9,marginTop:12}}>
            <button className="btn-green" onClick={save} disabled={saving}>{saving?"A guardar...":editId?"Guardar":"Adicionar"}</button>
            <button className="btn-sm btn-gray" style={{padding:"9px 16px"}} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header"><div className="card-title">Parceiros ({partners.length})</div><button className="btn-green btn-sm" onClick={()=>{setForm(empty);setEditId(null);setShowForm(true);}}>+ Novo</button></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:11,padding:14}}>
          {partners.map(p=>(
            <div key={p.id||p._id} style={{background:"var(--off-white)",borderRadius:10,border:"1px solid var(--border)",overflow:"hidden"}}>
              <div style={{height:75,background:"var(--gray)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{p.logo?<img src={p.logo} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}} />:<div style={{fontSize:28,opacity:.15}}>🏢</div>}</div>
              <div style={{padding:"9px 11px"}}>
                <div style={{fontWeight:800,fontSize:13}}>{p.name}</div>
                <div style={{fontSize:11,color:"var(--green)",fontWeight:600}}>{p.type}</div>
                <div style={{display:"flex",gap:5,marginTop:7}}><button className="btn-sm btn-gray" onClick={()=>{setForm({name:p.name,type:p.type,logo:p.logo||"",desc:p.desc||""});setEditId(p.id||p._id);setShowForm(true);}}>✏️</button><button className="btn-sm btn-red" onClick={()=>remove(p)}>🗑️</button></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminFeedbacks({ feedbacks }) {
  const typeColors={"Sugestão":"#3B82F6","Erro/Bug":"#DC2626","Novo Produto":"#16A34A","Melhoria de Design":"#8B5CF6","Outro":"#F59E0B"};
  const markRead=async id=>{try{await updDoc("feedbacks",id,{status:"Lido"});}catch(e){console.error(e);}};
  const remove=async id=>{if(window.confirm("Remover?"))try{await delDoc("feedbacks",id);}catch(e){console.error(e);}};
  return (
    <div>
      <div className="admin-title">Sugestões de Clientes</div>
      {feedbacks.length===0?(<div style={{background:"#fff",borderRadius:13,padding:"40px 22px",textAlign:"center",color:"var(--ink-muted)",border:"1px solid var(--border)"}}><div style={{fontSize:40,marginBottom:9}}>💡</div><div style={{fontWeight:700}}>Ainda sem sugestões</div></div>):feedbacks.map(f=>{const tc=typeColors[f.type]||"#6B7280";const id=f.id||f._id;return(
      <div key={id} className="feedback-card" style={{opacity:f.status==="Lido"?.6:1}}>
        <div style={{position:"absolute",top:13,right:13,background:`${tc}18`,color:tc,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:100,textTransform:"uppercase",letterSpacing:".07em"}}>{f.type}</div>
        <div style={{fontSize:11,color:"var(--ink-muted)",marginBottom:4}}>{f.date} · {f.clientName} ({f.clientCode})</div>
        <div style={{fontSize:13,color:"var(--ink-soft)",lineHeight:1.7,fontWeight:300}}>{f.message}</div>
        <div style={{display:"flex",gap:7,marginTop:9}}>{f.status==="Novo"&&<button className="btn-sm btn-gray" onClick={()=>markRead(id)}>✓ Lido</button>}<button className="btn-sm btn-red" onClick={()=>remove(id)}>🗑️</button></div>
      </div>);})}
    </div>
  );
}

function AdminSecurity({ settings, setSettings, securityLog }) {
  const adminPassword=settings?.adminPassword||"menamart2026";
  const [cur,setCur]=useState("");const [nw,setNw]=useState("");const [cnf,setCnf]=useState("");const [msg,setMsg]=useState(null);
  const changePw=async()=>{
    if(!cur||!nw||!cnf){setMsg({e:true,t:"Preencha todos os campos."});return;}
    if(cur!==adminPassword){setMsg({e:true,t:"Senha actual incorrecta."});return;}
    if(nw.length<8){setMsg({e:true,t:"Mínimo 8 caracteres."});return;}
    if(nw!==cnf){setMsg({e:true,t:"Senhas não coincidem."});return;}
    try{await setDoc(doc(db,"settings","main"),{...settings,adminPassword:nw});}catch(e){console.error(e);}
    setCur("");setNw("");setCnf("");setMsg({e:false,t:"✅ Senha alterada!"});
  };
  return (
    <div>
      <div className="admin-title">Segurança</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:20,alignItems:"start"}}>
        <div className="form-section" style={{marginBottom:0}}>
          <div className="form-section-title">🔑 Alterar Senha</div>
          {msg&&<div style={{background:msg.e?"#FEE2E2":"var(--green-pale)",border:`1px solid ${msg.e?"#FCA5A5":"var(--green-pale2)"}`,borderRadius:8,padding:"9px 13px",fontSize:13,color:msg.e?"#DC2626":"var(--green)",marginBottom:11,fontWeight:700}}>{msg.t}</div>}
          {[["Senha Actual",cur,setCur],["Nova Senha (mín. 8)",nw,setNw],["Confirmar Nova",cnf,setCnf]].map(([label,val,setter],i)=>(
            <div key={i} className="admin-form-field" style={{marginBottom:11}}><label>{label}</label><input type="password" value={val} onChange={e=>{setter(e.target.value);setMsg(null);}} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&changePw()} /></div>
          ))}
          <button className="btn-green" style={{padding:"10px 18px"}} onClick={changePw}>Alterar Senha</button>
          <div style={{marginTop:16,padding:"11px 13px",background:"var(--off-white)",borderRadius:8,border:"1px solid var(--border)",fontSize:12,color:"var(--ink-soft)",lineHeight:1.9}}>
            <strong style={{display:"block",marginBottom:4,fontWeight:700}}>Acesso Admin</strong>
            • Atalho: <strong>Ctrl + Shift + Alt + M</strong><br />
            • Ou: clique no logo do rodapé <strong>5 vezes</strong>
          </div>
        </div>
        <div className="form-section" style={{marginBottom:0}}>
          <div className="form-section-title">🔐 Registo de Acessos</div>
          <div style={{maxHeight:320,overflowY:"auto"}}>
            {securityLog.length===0?<div style={{textAlign:"center",padding:"18px 0",color:"var(--ink-muted)",fontSize:13}}>Nenhum registo.</div>:[...securityLog].reverse().map((entry,i)=>(
              <div key={i} className={`sec-log-entry ${entry.success?"sec-log-ok":"sec-log-warn"}`}>
                <span>{entry.success?"✅":"❌"}</span>
                <div><div style={{fontWeight:700,fontSize:12}}>{entry.event}</div><div style={{fontSize:11,color:"var(--ink-muted)",marginTop:1}}>{entry.time}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPayment({ settings }) {
  const [form,setForm]=useState({...DEFAULT_SETTINGS,...settings});
  const [saved,setSaved]=useState(false);
  const save=async()=>{
    try{await setDoc(doc(db,"settings","main"),form);}catch(e){console.error(e);}
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };
  return (
    <div>
      <div className="admin-title">Gateway de Pagamento</div>
      {saved&&<div style={{background:"var(--green-pale)",border:"1px solid var(--green-pale2)",borderRadius:9,padding:"10px 14px",marginBottom:13,fontWeight:700,color:"var(--green)"}}>✅ Guardado!</div>}
      <div className="pay-gw-card">
        <div className="pay-gw-title">🔘 Métodos Aceites</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:9,marginBottom:13}}>
          {PAYMENT_METHODS.map(m=>{const isC=CREDIT_METHODS.includes(m.id);const checked=form.acceptedMethods.includes(m.id);return(
            <label key={m.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",border:`1.5px solid ${checked?(isC?"#7c3aed":"var(--green-light)"):"var(--border)"}`,borderRadius:8,background:checked?(isC?"#faf5ff":"var(--green-pale)"):"#fff",cursor:"pointer"}}>
              <input type="checkbox" checked={checked} onChange={e=>{if(e.target.checked)setForm(f=>({...f,acceptedMethods:[...f.acceptedMethods,m.id]}));else setForm(f=>({...f,acceptedMethods:f.acceptedMethods.filter(x=>x!==m.id)}));}} style={{marginTop:2}} />
              <div><div style={{fontWeight:700,fontSize:13}}>{m.icon} {m.label}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{m.desc}</div></div>
            </label>
          );})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
          <div className="admin-form-field"><label>Método por Defeito</label><select value={form.defaultMethod} onChange={e=>setForm(f=>({...f,defaultMethod:e.target.value}))}>{form.acceptedMethods.map(id=>{const m=PAYMENT_METHODS.find(x=>x.id===id);return<option key={id} value={id}>{m?.icon} {m?.label}</option>;})}</select></div>
          <div className="admin-form-field"><label>Multicaixa Ref.</label><input type="text" value={form.multicaixaRef||""} onChange={e=>setForm(f=>({...f,multicaixaRef:e.target.value}))} style={{fontFamily:"monospace"}} /></div>
        </div>
      </div>
      <button className="btn-green" style={{padding:"11px 24px",fontSize:14}} onClick={save}>💾 Guardar</button>
    </div>
  );
}

function AdminApp({ products, categories, orders, clients, feedbacks, partners, settings, setSettings, securityLog }) {
  const [tab,setTab]=useState("dashboard");
  const newFeedbacks=feedbacks.filter(f=>f.status==="Novo").length;
  const pendingOrders=orders.filter(o=>o.status==="Pending").length;
  const navItems=[{k:"dashboard",i:"📊",l:"Dashboard"},{k:"clients",i:"👥",l:"Clientes"},{k:"products",i:"📦",l:`Produtos`},{k:"orders",i:"🛒",l:`Encomendas${pendingOrders>0?` (${pendingOrders})`:""}`},{k:"payment",i:"💳",l:"Pagamentos"},{k:"partners",i:"🤝",l:"Parceiros"},{k:"feedbacks",i:"💡",l:`Sugestões${newFeedbacks>0?` (${newFeedbacks})`:""}`},{k:"security",i:"🔒",l:"Segurança"}];
  return (
    <div className="admin-wrap">
      <div className="admin-sidebar">
        <div style={{padding:"10px 10px 4px",display:"flex",alignItems:"center",gap:7}}><Logo height={24} /><span style={{fontFamily:"var(--font-display)",fontSize:14,color:"#7dd87d",fontWeight:800}}>Admin</span></div>
        <div className="admin-sidebar-label">Menu</div>
        {navItems.map(n=><button key={n.k} className={`admin-nav-btn${tab===n.k?" active":""}`} onClick={()=>setTab(n.k)}><span>{n.i}</span>{n.l}</button>)}
      </div>
      <div className="admin-content">
        {tab==="dashboard"&&<AdminDashboard products={products} orders={orders} clients={clients} feedbacks={feedbacks} />}
        {tab==="clients"&&<AdminClients clients={clients} orders={orders} settings={settings} setSettings={setSettings} />}
        {tab==="products"&&<AdminProducts products={products} categories={categories} />}
        {tab==="orders"&&<AdminOrders orders={orders} clients={clients} settings={settings} />}
        {tab==="payment"&&<AdminPayment settings={settings} />}
        {tab==="partners"&&<AdminPartners partners={partners} />}
        {tab==="feedbacks"&&<AdminFeedbacks feedbacks={feedbacks} />}
        {tab==="security"&&<AdminSecurity settings={settings} setSettings={setSettings} securityLog={securityLog} />}
      </div>
    </div>
  );
}


// =============================================================================
// ROOT APP
// =============================================================================
export default function App() {
  const [products,   productsLoading]   = useFirestoreCollection("products");
  const [categories, categoriesLoading] = useFirestoreCollection("categories");
  const [clients,    clientsLoading]    = useFirestoreCollection("clients");
  const [orders,     ordersLoading]     = useFirestoreCollection("orders");
  const [feedbacks,  feedbacksLoading]  = useFirestoreCollection("feedbacks");
  const [partners,   partnersLoading]   = useFirestoreCollection("partners");
  const [settingsArr,settingsLoading]   = useFirestoreCollection("settings");
  const settings = settingsArr.find(s=>s._id==="main"||s.id==="main") || DEFAULT_SETTINGS;
  const loading = productsLoading||categoriesLoading||clientsLoading||ordersLoading||feedbacksLoading||partnersLoading||settingsLoading;

  const [page,           setPage]           = useState("catalog");
  const [currentUser,    setCurrentUser]    = useState(null);
  const [showLogin,      setShowLogin]      = useState(false);
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPw,        setAdminPw]        = useState("");
  const [adminPwError,   setAdminPwError]   = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [adminLocked,    setAdminLocked]    = useState(false);
  const [lockTimer,      setLockTimer]      = useState(0);
  const [toast,          setToast]          = useState(null);
  const [securityLog,    setSecurityLog]    = useState([]);
  const [footerClicks,   setFooterClicks]   = useState(0);
  const footerTimer = useRef(null);
  const [seeded,         setSeeded]         = useState(false);

  useEffect(()=>{
    if(loading||seeded)return;
    const seedIfEmpty=async()=>{
      if(products.length===0){const batch=writeBatch(db);SEED_PRODUCTS.forEach(p=>batch.set(doc(db,"products",p.id),p));await batch.commit();}
      if(categories.length===0){const batch=writeBatch(db);SEED_CATEGORIES.forEach(c=>batch.set(doc(db,"categories",c.id),c));await batch.commit();}
      if(partners.length===0){const batch=writeBatch(db);SEED_PARTNERS.forEach(p=>batch.set(doc(db,"partners",p.id),p));await batch.commit();}
      if(settingsArr.length===0){await setDoc(doc(db,"settings","main"),DEFAULT_SETTINGS);}
      setSeeded(true);
    };
    seedIfEmpty();
  },[loading,seeded,products,categories,partners,settingsArr]);

  useEffect(()=>{
    if(!adminLocked)return;
    let t=60;setLockTimer(t);
    const iv=setInterval(()=>{t--;setLockTimer(t);if(t<=0){clearInterval(iv);setAdminLocked(false);setFailedAttempts(0);}},1000);
    return()=>clearInterval(iv);
  },[adminLocked]);

  useEffect(()=>{
    const onKey=e=>{
      if(e.ctrlKey&&e.shiftKey&&e.altKey&&e.key==="M"){e.preventDefault();setShowAdminModal(true);}
      if(e.key==="Escape"){setShowLogin(false);setShowAdminModal(false);setAdminPw("");setAdminPwError(false);}
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  const addSecLog=entry=>setSecurityLog(prev=>[...prev.slice(-49),{...entry,time:new Date().toLocaleString("pt-AO")}]);

  const handleFooterLogoClick=()=>{
    const next=footerClicks+1;
    if(footerTimer.current)clearTimeout(footerTimer.current);
    if(next>=5){setShowAdminModal(true);setFooterClicks(0);return;}
    setFooterClicks(next);
    footerTimer.current=setTimeout(()=>setFooterClicks(0),2000);
  };

  const adminPassword=settings?.adminPassword||"menamart2026";

  const handleAdminLogin=()=>{
    if(adminLocked)return;
    if(adminPw===adminPassword){
      setIsAdmin(true);setShowAdminModal(false);setAdminPw("");setAdminPwError(false);setFailedAttempts(0);
      addSecLog({event:"✅ Login admin bem-sucedido",success:true});
    }else{
      const attempts=failedAttempts+1;setFailedAttempts(attempts);setAdminPwError(true);
      addSecLog({event:`❌ Tentativa falhada (${attempts}/${MAX_FAILED_ATTEMPTS})`,success:false});
      if(attempts>=MAX_FAILED_ATTEMPTS){
        setAdminLocked(true);setShowAdminModal(false);setAdminPw("");
        addSecLog({event:`🚨 Bloqueado`,success:false});
        setToast({msg:`🚨 Admin bloqueado! ${attempts} tentativas falhadas.`,warn:true});
        setTimeout(()=>setToast(null),8000);
      }
    }
  };

  const handleNewOrder=async order=>{
    try{await setDoc(doc(db,"orders",order.id),order);}catch(e){console.error(e);}
    setToast({msg:`🛒 Nova encomenda de ${order.clientName} · ${fmt(order.total)}`});
    setTimeout(()=>setToast(null),6000);
  };

  const setSettings=async newSettings=>{try{await setDoc(doc(db,"settings","main"),newSettings);}catch(e){console.error(e);}};

  const goTo=pageKey=>{
    if(pageKey==="login"){setShowLogin(true);return;}
    setShowLogin(false);setPage(pageKey);
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const handleLogin=user=>{setCurrentUser(user);setShowLogin(false);setPage("catalog");};
  const handleLogout=()=>{setCurrentUser(null);setPage("catalog");};

  if(loading){
    return(
      <>
        <style>{STYLES}</style>
        <div className="loading-screen">
          <Logo height={64} style={{opacity:.85}} />
          <div className="loading-spinner" />
          <div className="loading-text">A carregar Menamart...</div>
        </div>
      </>
    );
  }

  if(isAdmin){
    return(
      <>
        <style>{STYLES}</style>
        <nav className="nav">
          <div className="nav-top">
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Logo height={30} /><span style={{fontFamily:"var(--font-display)",fontSize:16,color:"#7dd87d",fontWeight:800}}>Menamart</span>
              <span style={{fontSize:10,fontWeight:700,background:"rgba(232,88,10,.15)",color:"#ff8040",border:"1px solid rgba(232,88,10,.25)",borderRadius:6,padding:"3px 9px",letterSpacing:".08em",textTransform:"uppercase"}}>Admin</span>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
              {toast&&<span style={{background:"var(--orange)",color:"#fff",borderRadius:100,padding:"4px 12px",fontSize:12,fontWeight:700}}>🔔 Nova encomenda</span>}
              <button onClick={()=>setIsAdmin(false)} style={{padding:"6px 13px",background:"rgba(220,38,38,.12)",color:"#f87171",border:"1px solid rgba(220,38,38,.25)",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer"}}>✕ Sair do Admin</button>
            </div>
          </div>
        </nav>
        <AdminApp products={products} categories={categories} orders={orders} clients={clients} feedbacks={feedbacks} partners={partners} settings={settings} setSettings={setSettings} securityLog={securityLog} />
        {toast&&<div className={`toast${toast.warn?" toast-warn":""}`}><div>{toast.msg}</div><button className="toast-close" onClick={()=>setToast(null)}>✕</button></div>}
      </>
    );
  }

  // FIX #5: Catalog shown to everyone (guests see products but not prices)
  const renderPage=()=>{
    if(page==="sobre") return (<><NavBar page={page} goTo={goTo} currentUser={currentUser} onCartOpen={()=>{}} onSearch={()=>{}} /><PageSobreNos goTo={goTo} partners={partners} /></>);
    if(page==="contacto") return (<><NavBar page={page} goTo={goTo} currentUser={currentUser} onCartOpen={()=>{}} onSearch={()=>{}} /><PageContacto goTo={goTo} /></>);
    if(page==="account"&&currentUser) return <ClientAccount currentUser={currentUser} setCurrentUser={setCurrentUser} orders={orders} goTo={goTo} onLogout={handleLogout} onSecretClick={handleFooterLogoClick} />;
    if(page==="home") return (<><NavBar page="home" goTo={goTo} currentUser={currentUser} onCartOpen={()=>{}} onSearch={()=>{}} /><PublicLanding goTo={goTo} /></>);
    // Default: catalog (shown to guests and logged-in users)
    return <BuyerCatalog products={products} categories={categories} currentUser={currentUser} settings={settings} onNewOrder={handleNewOrder} goTo={goTo} onLogout={handleLogout} onSecretClick={handleFooterLogoClick} />;
  };

  return(
    <>
      <style>{STYLES}</style>
      {renderPage()}
      {showLogin&&<PageLogin clients={clients} onLogin={handleLogin} onClose={()=>setShowLogin(false)} />}
      {toast&&<div className={`toast${toast.warn?" toast-warn":""}`}><div>{toast.msg}</div><button className="toast-close" onClick={()=>setToast(null)}>✕</button></div>}
      {adminLocked&&<div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#991b1b",color:"#fff",borderRadius:13,padding:"26px 34px",textAlign:"center",zIndex:700,boxShadow:"0 20px 60px rgba(0,0,0,.4)"}}><div style={{fontSize:34,marginBottom:9}}>🔒</div><div style={{fontWeight:900,fontSize:17,marginBottom:5}}>Acesso Bloqueado</div><div style={{fontSize:13,opacity:.8}}>Aguarde {lockTimer} segundos</div></div>}
      {showAdminModal&&!adminLocked&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setShowAdminModal(false);setAdminPw("");setAdminPwError(false);}}}>
          <div className="modal-box" style={{maxWidth:370}}>
            <button className="modal-x" onClick={()=>{setShowAdminModal(false);setAdminPw("");setAdminPwError(false);}}>✕</button>
            <div className="modal-head"><img src={LOGO_SRC} alt="Menamart" /><h2>Acesso Administrativo</h2><p>Área restrita — equipa Menamart</p></div>
            <div className="modal-body">
              {failedAttempts>0&&<div className="security-attempts">🚨 <strong>{failedAttempts}/{MAX_FAILED_ATTEMPTS}</strong> tentativas falhadas.</div>}
              {adminPwError&&<div className="modal-error">❌ Senha incorrecta.</div>}
              <div className="form-field"><label className="form-label">Senha de Administrador</label><input className="form-input" type="password" value={adminPw} autoFocus onChange={e=>{setAdminPw(e.target.value);setAdminPwError(false);}} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()} /></div>
              <button className="modal-submit" onClick={handleAdminLogin}>Entrar →</button>
              <button className="modal-back" onClick={()=>{setShowAdminModal(false);setAdminPw("");setAdminPwError(false);}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}