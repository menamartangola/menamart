import React, { useState, useMemo, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, setDoc, addDoc,
  onSnapshot, updateDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =============================================================================
// FIREBASE CONFIG — your keys
// =============================================================================
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

// Firestore helpers
const col = name => collection(db, name);
const saveDoc = (colName, id, data) => setDoc(doc(db, colName, String(id)), data);
const delDoc  = (colName, id) => deleteDoc(doc(db, colName, String(id)));
const updDoc  = (colName, id, data) => updateDoc(doc(db, colName, String(id)), data);

// =============================================================================
// CONSTANTS
// =============================================================================
const WA_NUMBER   = "244933929233";
const OWNER_EMAIL = "menamart.angola@gmail.com";
const MOV         = 500_000;
const APP_VERSION = "4.0.0";
const MAX_FAILED_ATTEMPTS = 3;
const CREDIT_METHODS = ["credit_week", "credit_month"];

const fmt = n => "AKZ " + new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 0 }).format(Math.round(n));
const waLink = (msg, phone = WA_NUMBER) => `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const notifyWA = (msg) => window.open(waLink(msg, WA_NUMBER), "_blank");

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

const LOGO_SRC = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'%3E%3Crect width='120' height='40' rx='8' fill='%231B6B1B'/%3E%3Ctext x='10' y='27' font-family='serif' font-size='18' font-weight='bold' fill='%237dd87d'%3EMena%3C/text%3E%3Ctext x='62' y='27' font-family='serif' font-size='18' font-weight='bold' fill='%23ff8040'%3Emart%3C/text%3E%3C/svg%3E";

// =============================================================================
// INITIAL SEED DATA (only used once to populate Firestore)
// =============================================================================
const SEED_PRODUCTS = [
  { id:"p1",  name:"Arroz Carolino",      sub:"Saco 25kg",     category:"Arroz",       costPrice:8500,  sellingPrice:12500, stock:true, img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
  { id:"p2",  name:"Frango Inteiro",      sub:"Por kg",        category:"Carnes",      costPrice:5500,  sellingPrice:9000,  stock:true, img:"https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80" },
  { id:"p3",  name:"Tomate Fresco",       sub:"Caixa 10kg",    category:"Legumes",     costPrice:2800,  sellingPrice:4500,  stock:true, img:"https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&q=80" },
  { id:"p4",  name:"Farinha Premium",     sub:"Saco 50kg",     category:"Farinhas",    costPrice:11000, sellingPrice:15000, stock:true, img:"https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
  { id:"p5",  name:"Batata Branca",       sub:"Saco 25kg",     category:"Legumes",     costPrice:3500,  sellingPrice:5800,  stock:true, img:"https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80" },
  { id:"p6",  name:"Salmão Atlântico",    sub:"Caixa 5kg",     category:"Peixe",       costPrice:15000, sellingPrice:22000, stock:true, img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80" },
  { id:"p7",  name:"Bife Premium",        sub:"Caixa 10kg",    category:"Carnes",      costPrice:13000, sellingPrice:18500, stock:true, img:"https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80" },
  { id:"p8",  name:"Azeite Extra Virgin", sub:"Lata 5L",       category:"Oleos",       costPrice:10500, sellingPrice:16000, stock:true, img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { id:"p9",  name:"Sal Marinho",         sub:"Balde 10kg",    category:"Condimentos", costPrice:2800,  sellingPrice:7300,  stock:true, img:"https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=80" },
  { id:"p10", name:"Café Moído",          sub:"Caixa 10x500g", category:"Bebidas",     costPrice:24000, sellingPrice:36000, stock:true, img:"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80" },
  { id:"p11", name:"Feijão Frade",        sub:"Saco 25kg",     category:"Leguminosas", costPrice:12000, sellingPrice:18500, stock:true, img:"https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80" },
  { id:"p12", name:"Oleo de Girassol",    sub:"Bidon 20L",     category:"Oleos",       costPrice:16000, sellingPrice:22000, stock:true, img:"https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400&q=80" },
];
const SEED_CATEGORIES = [
  { id:"c1", name:"Arroz",       img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
  { id:"c2", name:"Carnes",      img:"https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80" },
  { id:"c3", name:"Legumes",     img:"https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&q=80" },
  { id:"c4", name:"Peixe",       img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80" },
  { id:"c5", name:"Farinhas",    img:"https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
  { id:"c6", name:"Condimentos", img:"https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=80" },
  { id:"c7", name:"Oleos",       img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { id:"c8", name:"Leguminosas", img:"https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80" },
  { id:"c9", name:"Bebidas",     img:"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80" },
];
const SEED_PARTNERS = [
  { id:"pa1", name:"Fazenda Angola",     type:"Produtor",    logo:"https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&q=80", desc:"Arroz e cereais" },
  { id:"pa2", name:"Frigorífico Luanda", type:"Frigorífico", logo:"https://images.unsplash.com/photo-1558030006-450675393462?w=200&q=80",    desc:"Carnes frescas" },
  { id:"pa3", name:"Pesca Atlântico",    type:"Peixe",       logo:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&q=80", desc:"Peixe e marisco" },
  { id:"pa4", name:"AgroSul Angola",     type:"Legumes",     logo:"https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=200&q=80", desc:"Hortícolas frescos" },
  { id:"pa5", name:"Moagem Nacional",    type:"Farinhas",    logo:"https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&q=80", desc:"Farinhas processadas" },
  { id:"pa6", name:"Oleosa Angola",      type:"Óleos",       logo:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&q=80", desc:"Óleos vegetais" },
];
const DEFAULT_SETTINGS = {
  banks: [{ id:"b1", bankName:"Banco BFA", accountName:"Menamart Lda", iban:"AO06.0040.0000.0000.0000.1019.6" }],
  defaultMethod:"on_delivery",
  acceptedMethods:["prepaid","on_delivery","bank_transfer","multicaixa","credit_week","credit_month"],
  multicaixaRef:"933 929 233",
  creditClients:[],
  adminPassword:"menamart2026",
};

// =============================================================================
// FIREBASE HOOKS — real-time listeners
// =============================================================================
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
// STYLES
// =============================================================================
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --green:#1B6B1B;--green-dark:#0f430f;--green-mid:#256625;--green-light:#38a838;
  --green-pale:#edf7ed;--green-pale2:#c2e0c2;--orange:#E8580A;--orange-dark:#bc420a;
  --orange-pale:#fff0e8;--white:#fff;--off-white:#f8faf8;
  --gray:#eff2ef;--border:#e0eae0;--ink:#0c1a0c;--ink-soft:#2b422b;--ink-muted:#6b8a6b;
  --shadow-sm:0 1px 6px rgba(0,0,0,.06);--shadow:0 4px 20px rgba(0,0,0,.08);
  --shadow-lg:0 8px 40px rgba(0,0,0,.12);--shadow-xl:0 20px 60px rgba(0,0,0,.18);
  --radius:14px;--radius-sm:9px;
  --font-display:'Cormorant Garamond',serif;
  --font-body:'DM Sans',sans-serif;
}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);background:var(--off-white);color:var(--ink);-webkit-font-smoothing:antialiased;overflow-x:hidden}
.nav{position:sticky;top:0;z-index:200;height:62px;padding:0 28px;display:flex;align-items:center;justify-content:space-between;background:#0c1a0c;border-bottom:1px solid rgba(255,255,255,.06);box-shadow:0 2px 16px rgba(0,0,0,.25)}
.nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer}
.nav-logo img{height:34px;width:auto;object-fit:contain;mix-blend-mode:luminosity;opacity:.9}
.nav-brand{font-family:var(--font-display);font-size:22px;letter-spacing:.01em;font-weight:700}
.nav-brand-mena{color:#7dd87d}.nav-brand-mart{color:#ff8040}
.nav-links{display:flex;gap:2px}
.nav-btn{padding:7px 15px;border-radius:7px;font-family:var(--font-body);font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;color:rgba(255,255,255,.5);transition:all .2s}
.nav-btn:hover,.nav-btn.active{background:rgba(125,216,125,.1);color:#7dd87d}
.nav-right{display:flex;align-items:center;gap:8px}
.cart-btn{display:flex;align-items:center;gap:7px;padding:8px 16px;background:var(--green);color:#fff;border:none;border-radius:9px;font-family:var(--font-body);font-weight:700;font-size:13px;cursor:pointer;transition:all .2s}
.cart-btn:hover{background:var(--green-light);transform:translateY(-1px)}
.cart-count{background:var(--orange);color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}
.user-pill{font-family:var(--font-body);font-size:12px;font-weight:600;color:#7dd87d;background:rgba(125,216,125,.08);border:1px solid rgba(125,216,125,.2);border-radius:7px;padding:6px 12px;cursor:pointer;transition:all .2s}
.user-pill:hover{background:rgba(125,216,125,.15)}
.btn-outline-nav{padding:6px 14px;border:1px solid rgba(255,255,255,.18);border-radius:7px;font-family:var(--font-body);font-weight:600;font-size:13px;cursor:pointer;background:none;color:rgba(255,255,255,.65);transition:all .2s}
.btn-outline-nav:hover{border-color:rgba(125,216,125,.4);color:#7dd87d}
.hero-wrap{background:#0c1a0c;padding:72px 24px 60px;text-align:center;position:relative;overflow:hidden}
.hero-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(125,216,125,.1);border:1px solid rgba(125,216,125,.2);border-radius:100px;padding:5px 16px;font-family:var(--font-body);font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#7dd87d;margin-bottom:20px}
.hero-badge::before{content:'';width:5px;height:5px;border-radius:50%;background:#ff8040;animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
.hero-title{font-family:var(--font-display);font-size:clamp(30px,5.5vw,58px);color:#fff;font-weight:700;line-height:1.08;margin-bottom:16px;letter-spacing:-.01em}
.hero-title em{font-style:italic;color:#a8e6a8}
.hero-sub{font-size:15px;color:rgba(255,255,255,.48);max-width:480px;margin:0 auto 36px;line-height:1.75;font-weight:300}
.hero-cta-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.steps-section{background:#ffffff;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:72px 24px}
.step-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}
.step-card{background:var(--off-white);border:1.5px solid var(--border);border-radius:16px;padding:26px 22px;transition:all .25s;box-shadow:var(--shadow-sm)}
.step-card:hover{transform:translateY(-3px);box-shadow:var(--shadow);border-color:var(--green-pale2);background:var(--white)}
.step-num{width:36px;height:36px;border-radius:10px;background:var(--orange);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:17px;color:#fff;margin-bottom:14px;font-weight:700}
.step-icon{font-size:24px;margin-bottom:8px}
.step-title{font-family:var(--font-display);font-size:18px;color:var(--ink);margin-bottom:7px;font-weight:600}
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
.btn-outline{padding:8px 15px;border:1px solid var(--border);border-radius:8px;font-family:var(--font-body);font-weight:600;font-size:13px;cursor:pointer;background:var(--white);color:var(--ink-soft);transition:all .15s}
.btn-outline:hover{border-color:var(--green);color:var(--green)}
.section{padding:48px 24px;max-width:1200px;margin:0 auto;width:100%}
.section-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:20px}
.section-title{font-family:var(--font-display);font-size:26px;font-weight:700;letter-spacing:-.01em}
.section-link{font-family:var(--font-body);font-size:13px;font-weight:600;color:var(--green);cursor:pointer}
.eyebrow{font-family:var(--font-body);font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--orange);margin-bottom:9px;text-align:center}
.card{background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow);border:1px solid var(--border);margin-bottom:18px}
.card-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:var(--off-white)}
.card-title{font-family:var(--font-display);font-size:17px;font-weight:600}
.info-box{background:var(--green-pale);border:1px solid var(--green-pale2);border-left:3px solid var(--green-light);border-radius:var(--radius-sm);padding:13px 16px;font-size:13px;color:var(--ink-soft);line-height:1.7}
.credit-box{background:#faf5ff;border:1px solid #e9d5ff;border-left:3px solid #7c3aed;border-radius:var(--radius-sm);padding:13px 16px;font-size:13px;color:#4c1d95;line-height:1.7;margin-top:8px}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.cat-card{border-radius:12px;overflow:hidden;cursor:pointer;box-shadow:var(--shadow-sm);transition:all .22s;background:var(--white);border:1px solid var(--border)}
.cat-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.cat-card img{width:100%;height:80px;object-fit:cover;display:block;transition:transform .35s}
.cat-card:hover img{transform:scale(1.06)}
.cat-card-label{padding:8px 10px;font-family:var(--font-body);font-weight:600;font-size:12px;color:var(--ink);text-align:center}
.prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
.prod-card{background:var(--white);border-radius:12px;box-shadow:var(--shadow-sm);overflow:hidden;display:flex;flex-direction:column;transition:all .22s;border:1px solid var(--border)}
.prod-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.prod-card.out-of-stock{opacity:.6}
.prod-img{position:relative;height:130px;overflow:hidden;background:var(--gray)}
.prod-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s}
.prod-card:hover .prod-img img{transform:scale(1.05)}
.oos-badge{position:absolute;top:8px;right:0;background:#DC2626;color:#fff;font-family:var(--font-body);font-size:9px;font-weight:700;padding:3px 9px 3px 7px;border-radius:4px 0 0 4px;letter-spacing:.05em}
.prod-body{padding:10px 12px;flex:1}
.prod-name{font-family:var(--font-body);font-weight:700;font-size:13px;color:var(--ink);line-height:1.3;margin-bottom:2px}
.prod-sub{font-size:11px;color:var(--ink-muted)}
.prod-price{font-family:var(--font-display);font-size:15px;color:var(--green);margin-top:6px;font-weight:600}
.stock-yes{font-family:var(--font-body);font-size:10px;font-weight:700;color:var(--green);background:var(--green-pale);padding:2px 7px;border-radius:100px}
.stock-no{font-family:var(--font-body);font-size:10px;font-weight:700;color:#DC2626;background:#FEE2E2;padding:2px 7px;border-radius:100px}
.add-btn{margin:0 12px 12px;padding:8px;background:var(--green);color:#fff;border:none;border-radius:8px;font-family:var(--font-body);font-weight:700;font-size:13px;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:5px}
.add-btn:hover:not(:disabled){background:var(--green-light)}
.add-btn:disabled{background:var(--border);color:var(--ink-muted);cursor:not-allowed}
.qty-ctrl{display:flex;align-items:center;gap:6px;justify-content:center;padding:0 12px 12px}
.qty-btn{width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:var(--gray);cursor:pointer;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);transition:all .13s}
.qty-btn:hover{border-color:var(--green);background:var(--green-pale);color:var(--green)}
.qty-num{font-family:var(--font-body);font-weight:800;font-size:14px;min-width:24px;text-align:center}
.pills{display:flex;gap:7px;flex-wrap:wrap}
.pill{padding:6px 14px;border-radius:100px;font-family:var(--font-body);font-weight:500;font-size:12px;cursor:pointer;border:1px solid var(--border);background:var(--white);color:var(--ink-soft);transition:all .15s;white-space:nowrap}
.pill:hover{border-color:var(--green);color:var(--green)}
.pill.active{background:var(--green);border-color:var(--green);color:#fff}
.cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300;animation:fade-in .18s}
@keyframes fade-in{from{opacity:0}}
@keyframes slide-right{from{transform:translateX(100%)}}
@keyframes pop-in{from{transform:scale(.94);opacity:0}}
.cart-panel{position:fixed;right:0;top:0;bottom:0;width:min(400px,100vw);background:#fff;z-index:301;display:flex;flex-direction:column;box-shadow:-8px 0 48px rgba(0,0,0,.18);animation:slide-right .28s cubic-bezier(.22,1,.36,1);font-family:var(--font-body)}
.cart-head{padding:18px 20px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--off-white);flex-shrink:0}
.cart-head-title{font-family:var(--font-display);font-size:21px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:9px;letter-spacing:-.01em}
.cart-badge{background:var(--green);color:#fff;font-family:var(--font-body);font-size:10px;font-weight:800;padding:2px 8px;border-radius:100px}
.cart-close-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border);background:var(--off-white);color:var(--ink-soft);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s;font-weight:700}
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
.cart-row-line{font-family:var(--font-display);font-size:14px;color:var(--green);font-weight:600;white-space:nowrap}
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
.cart-total-val{font-family:var(--font-display);font-size:24px;color:var(--green);font-weight:700}
.pay-section-label{font-family:var(--font-body);font-size:10px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:7px}
.pay-chips{display:flex;flex-wrap:wrap;gap:6px}
.pay-chip{padding:6px 12px;border-radius:100px;border:1.5px solid var(--border);background:#fff;cursor:pointer;font-family:var(--font-body);font-size:12px;font-weight:600;color:var(--ink-soft);transition:all .15s;white-space:nowrap}
.pay-chip:hover{border-color:var(--green);color:var(--green)}
.pay-chip.sel{border-color:var(--green);background:var(--green-pale);color:var(--green)}
.pay-chip.credit-chip{border-color:#e9d5ff;color:#7c3aed}
.pay-chip.credit-chip.sel{background:#faf5ff;border-color:#7c3aed}
.pay-info{background:var(--off-white);border:1px solid var(--border);border-radius:9px;padding:9px 12px;font-size:12px;color:var(--ink-soft);line-height:1.7}
.cart-checkout-btn{padding:13px;border-radius:11px;border:none;font-family:var(--font-body);font-weight:800;font-size:14px;cursor:pointer;transition:all .18s;width:100%}
.cart-checkout-btn.ready{background:#1B6B1B;color:#fff}
.cart-checkout-btn.ready:hover{background:var(--green-light);transform:translateY(-1px)}
.cart-checkout-btn.not-ready{background:var(--border);color:var(--ink-muted);cursor:not-allowed}
.cart-checkout-btn.credit-ready{background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff}
.cart-delivery-note{background:var(--green-pale);border-radius:8px;padding:8px 11px;font-size:11px;color:var(--ink-soft);display:flex;align-items:flex-start;gap:6px;line-height:1.5}
.float-cart{position:fixed;bottom:22px;right:22px;background:var(--green);color:#fff;border:none;border-radius:100px;padding:12px 22px;font-family:var(--font-body);font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 4px 24px rgba(27,107,27,.45);display:flex;align-items:center;gap:9px;z-index:150;transition:all .18s;animation:pop-in .25s}
.float-cart:hover{background:var(--green-light);transform:translateY(-2px)}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);animation:fade-in .18s}
.modal-box{background:var(--white);border-radius:18px;max-width:480px;width:100%;animation:pop-in .3s cubic-bezier(.22,1,.36,1);box-shadow:var(--shadow-xl);max-height:93vh;overflow-y:auto;position:relative}
.modal-x{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:8px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .15s;z-index:10}
.modal-x:hover{background:rgba(255,255,255,.25)}
.modal-x.dark{border-color:var(--border);background:var(--gray);color:var(--ink-soft)}
.modal-x.dark:hover{background:var(--ink);color:#fff}
.modal-head{background:#0c1a0c;padding:28px 28px 22px;text-align:center;position:relative;border-radius:18px 18px 0 0}
.modal-head img{height:38px;margin-bottom:12px;mix-blend-mode:luminosity}
.modal-head h2{font-family:var(--font-display);font-size:22px;color:#fff;margin-bottom:3px;font-weight:700}
.modal-head p{font-size:12px;color:rgba(255,255,255,.5)}
.modal-body{padding:22px 26px 26px}
.modal-error{background:#FEE2E2;border:1px solid #FCA5A5;border-radius:8px;padding:9px 13px;font-size:13px;color:#DC2626;margin-bottom:12px;font-weight:600}
.form-field{margin-bottom:13px}
.form-label{display:block;font-family:var(--font-body);font-size:10px;font-weight:700;color:var(--ink-soft);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
.form-input{width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:9px;font-family:var(--font-body);font-size:14px;color:var(--ink);outline:none;transition:border-color .18s;background:var(--white)}
.form-input:focus{border-color:var(--green)}
.modal-submit{width:100%;padding:12px;background:var(--green);color:#fff;border:none;border-radius:9px;font-family:var(--font-body);font-weight:800;font-size:14px;cursor:pointer;margin-top:7px;transition:all .18s}
.modal-submit:hover{background:var(--green-light)}
.modal-back{width:100%;padding:9px;margin-top:7px;background:none;border:1px solid var(--border);border-radius:8px;font-family:var(--font-body);font-weight:600;font-size:13px;cursor:pointer;color:var(--ink-soft)}
.modal-back:hover{border-color:var(--green)}
.success-modal{background:var(--white);border-radius:18px;padding:40px 32px;max-width:420px;width:100%;text-align:center;animation:pop-in .3s cubic-bezier(.22,1,.36,1);box-shadow:var(--shadow-xl);position:relative}
.success-icon{font-size:52px;margin-bottom:14px}
.success-title{font-family:var(--font-display);font-size:26px;color:var(--green);margin-bottom:8px;font-weight:700}
.success-sub{color:var(--ink-muted);font-size:13px;line-height:1.7;margin-bottom:18px;font-weight:300}
.order-id-box{background:var(--green-pale);border:2px solid var(--green-light);border-radius:10px;padding:10px 18px;font-family:var(--font-display);font-size:20px;color:var(--green);margin-bottom:18px;letter-spacing:.04em;font-weight:700}
.toast{position:fixed;top:72px;right:16px;z-index:600;background:#0f430f;color:#fff;border-radius:12px;padding:14px 42px 14px 18px;box-shadow:var(--shadow-xl);animation:pop-in .25s;max-width:320px;min-width:240px;font-family:var(--font-body);font-weight:600;font-size:13px;border:1px solid rgba(125,216,125,.2)}
.toast-close{position:absolute;top:7px;right:10px;background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:15px;font-weight:800}
.toast-warn{background:#991b1b;border-color:rgba(220,38,38,.3)}
.security-attempts{background:#7f1d1d;border:1px solid #b91c1c;border-radius:9px;padding:11px 14px;font-family:var(--font-body);font-size:13px;color:#fca5a5;margin-bottom:12px;line-height:1.6}
footer{background:#060e06;padding:52px 24px 26px;border-top:1px solid rgba(255,255,255,.04)}
.footer-inner{max-width:1100px;margin:0 auto}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:36px}
.footer-brand{display:flex;align-items:center;gap:9px;margin-bottom:12px;cursor:pointer}
.footer-brand img{height:28px;mix-blend-mode:luminosity;opacity:.6}
.footer-brand-name{font-family:var(--font-display);font-size:18px;color:#fff;font-weight:700}
.footer-brand-name span{color:#ff8040}
.footer-desc{font-size:13px;color:rgba(255,255,255,.3);line-height:1.8;max-width:270px;font-weight:300}
.footer-col-title{font-family:var(--font-body);font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.22);margin-bottom:14px}
.footer-link{display:block;font-size:13px;color:rgba(255,255,255,.4);margin-bottom:8px;cursor:pointer;transition:color .15s;text-decoration:none;font-weight:300}
.footer-link:hover{color:rgba(255,255,255,.75)}
.footer-divider{border:none;border-top:1px solid rgba(255,255,255,.05);margin-bottom:18px}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.footer-copy{font-size:11px;color:rgba(255,255,255,.2);font-weight:300}
.footer-version{font-family:var(--font-body);font-size:10px;color:rgba(255,255,255,.12);letter-spacing:.08em}
.toggle{position:relative;display:inline-block;width:38px;height:21px}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;inset:0;background:var(--border);border-radius:100px;cursor:pointer;transition:.25s}
.toggle-slider:before{content:'';position:absolute;width:15px;height:15px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s}
input:checked+.toggle-slider{background:var(--green-light)}
input:checked+.toggle-slider:before{transform:translateX(17px)}
.admin-wrap{display:grid;grid-template-columns:210px 1fr;min-height:calc(100vh - 62px)}
.admin-sidebar{background:#0c1a0c;padding:16px 8px;display:flex;flex-direction:column;gap:2px;border-right:1px solid rgba(255,255,255,.05)}
.admin-sidebar-label{font-family:var(--font-body);font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.18);padding:5px 10px;margin-top:10px}
.admin-nav-btn{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;cursor:pointer;color:rgba(255,255,255,.4);font-family:var(--font-body);font-size:13px;font-weight:500;transition:all .15s;border:none;background:none;width:100%;text-align:left}
.admin-nav-btn:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.75)}
.admin-nav-btn.active{background:rgba(125,216,125,.12);color:#7dd87d}
.admin-content{padding:26px;overflow-y:auto;background:var(--off-white)}
.admin-title{font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--ink);margin-bottom:3px;letter-spacing:-.01em}
.admin-sub{color:var(--ink-muted);font-size:13px;margin-bottom:22px;font-weight:300}
.stats-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:22px}
.stat-card{background:var(--white);border-radius:12px;padding:18px;box-shadow:var(--shadow-sm);border:1px solid var(--border);transition:all .18s}
.stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.stat-icon{font-size:20px;margin-bottom:9px}
.stat-value{font-family:var(--font-display);font-size:26px;font-weight:700;color:var(--ink)}
.stat-label{font-family:var(--font-body);font-size:10px;color:var(--ink-muted);margin-top:2px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.stat-note{font-size:11px;color:var(--green);font-weight:600;margin-top:4px}
table{width:100%;border-collapse:collapse}
th{padding:9px 13px;text-align:left;font-family:var(--font-body);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted);background:var(--off-white);border-bottom:1.5px solid var(--border)}
td{padding:11px 13px;font-size:13px;color:var(--ink-soft);border-bottom:1px solid #f0f4f0;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafcfa}
.tag{display:inline-block;padding:2px 8px;border-radius:100px;font-family:var(--font-body);font-size:11px;font-weight:700;background:var(--green-pale);color:var(--green)}
.tag-credit{background:#ede9fe;color:#5b21b6}
.status-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:100px;font-family:var(--font-body);font-size:11px;font-weight:700}
.status-dot{width:5px;height:5px;border-radius:50%}
.status-select{padding:4px 9px;border-radius:7px;border:1px solid var(--border);font-family:var(--font-body);font-size:12px;font-weight:700;cursor:pointer;outline:none}
.form-section{background:var(--white);border-radius:12px;padding:22px;border:1px solid var(--border);margin-bottom:18px}
.form-section-title{font-family:var(--font-display);font-size:18px;font-weight:600;margin-bottom:16px;color:var(--ink);padding-bottom:11px;border-bottom:1px solid var(--border)}
.admin-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.admin-form-full{grid-column:1/-1}
.admin-form-field{display:flex;flex-direction:column;gap:4px}
.admin-form-field label{font-family:var(--font-body);font-size:10px;font-weight:700;color:var(--ink-soft);letter-spacing:.07em;text-transform:uppercase}
.admin-form-field input,.admin-form-field select,.admin-form-field textarea{padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-family:var(--font-body);font-size:14px;color:var(--ink);background:var(--white);transition:border-color .15s;outline:none;width:100%}
.admin-form-field input:focus,.admin-form-field select:focus,.admin-form-field textarea:focus{border-color:var(--green)}
.margin-calc{background:#071507;border-radius:12px;padding:22px;margin-bottom:18px}
.margin-calc-title{font-family:var(--font-display);font-size:17px;color:#a8e6a8;margin-bottom:14px;font-weight:600}
.margin-calc-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.margin-input-field label{color:rgba(255,255,255,.45);font-family:var(--font-body);font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;display:block;margin-bottom:4px}
.margin-input-field input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;padding:8px 12px;border-radius:7px;font-family:var(--font-body);font-size:14px;outline:none;width:100%}
.margin-result{background:rgba(168,230,168,.08);border:1px solid rgba(168,230,168,.18);border-radius:7px;padding:10px 14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center}
.margin-result-label{font-size:12px;color:rgba(255,255,255,.4)}
.margin-result-value{font-family:var(--font-display);font-size:22px;color:#a8e6a8;font-weight:600}
.photo-upload-area{border:2px dashed var(--border);border-radius:10px;padding:16px;background:var(--off-white);display:flex;flex-direction:column;align-items:center;gap:10px;transition:border-color .18s}
.photo-upload-area:hover{border-color:var(--green-pale2)}
.feedback-card{background:var(--white);border-radius:12px;border:1px solid var(--border);padding:16px 18px;margin-bottom:12px;box-shadow:var(--shadow-sm);position:relative}
.feedback-type-badge{position:absolute;top:14px;right:14px;font-family:var(--font-body);font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;letter-spacing:.07em}
.feedback-date{font-size:11px;color:var(--ink-muted);margin-bottom:5px}
.feedback-company{font-family:var(--font-body);font-size:13px;font-weight:700;color:var(--ink);margin-bottom:5px}
.feedback-msg{font-size:13px;color:var(--ink-soft);line-height:1.7;font-weight:300}
.sec-log-entry{display:flex;gap:10px;padding:9px 12px;border-radius:8px;margin-bottom:6px;font-size:12px;align-items:flex-start}
.sec-log-ok{background:#f0fdf4;border:1px solid #bbf7d0}
.sec-log-warn{background:#fff7ed;border:1px solid #fed7aa}
.pay-gw-card{background:var(--white);border-radius:12px;padding:22px;border:1px solid var(--border);box-shadow:var(--shadow-sm);margin-bottom:14px}
.pay-gw-title{font-family:var(--font-display);font-size:18px;font-weight:600;margin-bottom:14px;padding-bottom:11px;border-bottom:1px solid var(--border)}
.catalog-bar{display:flex;background:var(--green-dark);padding:12px 22px;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,.07)}
.catalog-search{display:flex;flex:1;max-width:480px;background:rgba(255,255,255,.1);border-radius:9px;overflow:hidden;border:1px solid rgba(255,255,255,.12)}
.catalog-search input{flex:1;padding:10px 14px;border:none;background:none;font-family:var(--font-body);font-size:14px;color:#fff;outline:none}
.catalog-search input::placeholder{color:rgba(255,255,255,.4)}
.catalog-search button{background:rgba(255,255,255,.08);border:none;padding:0 16px;cursor:pointer;font-size:15px;color:rgba(255,255,255,.7)}
.back-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.8);padding:7px 13px;border-radius:7px;cursor:pointer;font-family:var(--font-body);font-weight:600;font-size:13px;transition:all .15s}
.back-btn:hover{background:rgba(255,255,255,.15);color:#fff}
.founders-section{background:#fff;padding:64px 24px}
.founders-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;max-width:960px;margin:0 auto}
.founder-card{border-radius:20px;overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--border);background:#fff}
.founder-photo-wrap{position:relative;height:300px;background:linear-gradient(160deg,#1a3a1a,#2d6b2d);overflow:hidden;display:flex;align-items:center;justify-content:center}
.founder-photo-wrap img{width:100%;height:100%;object-fit:cover;display:block}
.founder-photo-placeholder{font-size:100px;opacity:.12;color:#fff}
.founder-role-badge{position:absolute;bottom:16px;left:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.15);color:#fff;padding:6px 14px;border-radius:100px;font-family:var(--font-body);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.founder-body{padding:24px 26px 28px}
.founder-name{font-family:var(--font-display);font-size:26px;color:var(--ink);margin-bottom:4px;font-weight:700}
.founder-title{font-family:var(--font-body);font-size:10px;font-weight:700;color:var(--orange);letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px}
.founder-bio{font-size:14px;color:var(--ink-soft);line-height:1.78;font-weight:300}
.founder-contacts{display:flex;gap:7px;margin-top:14px;flex-wrap:wrap}
.founder-contact-chip{background:var(--off-white);border:1px solid var(--border);border-radius:100px;padding:5px 12px;font-size:12px;color:var(--ink-soft)}
.team-section{background:var(--off-white);padding:64px 24px;text-align:center;border-top:1px solid var(--border)}
.team-group-photo{max-width:880px;margin:24px auto 0;border-radius:18px;overflow:hidden;box-shadow:var(--shadow-lg);background:linear-gradient(160deg,#152515,#2a5c2a);height:340px;display:flex;align-items:center;justify-content:center;position:relative}
.team-group-photo img{width:100%;height:100%;object-fit:cover;display:block}
.team-group-overlay{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.55));padding:28px 24px 20px;text-align:center}
.values-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px;margin-top:36px}
.value-card{background:var(--off-white);border-radius:14px;padding:24px;border:1.5px solid var(--border);text-align:center;transition:all .2s}
.value-card:hover{transform:translateY(-3px);box-shadow:var(--shadow);border-color:var(--green-pale2);background:#fff}
.value-icon{font-size:30px;margin-bottom:12px}
.value-title{font-family:var(--font-display);font-size:17px;color:var(--ink);margin-bottom:7px;font-weight:600}
.value-desc{font-size:13px;color:var(--ink-muted);line-height:1.7;font-weight:300}
.future-section{background:linear-gradient(160deg,#071507,#1a4020);padding:64px 24px}
.future-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;margin-top:40px}
.future-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:22px;transition:all .22s}
.future-card:hover{background:rgba(255,255,255,.08);transform:translateY(-3px)}
.future-year{font-family:var(--font-body);font-size:10px;font-weight:700;color:#ff8040;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
.future-title{font-family:var(--font-display);font-size:18px;color:#fff;margin-bottom:8px;font-weight:600}
.future-desc{font-size:13px;color:rgba(255,255,255,.48);line-height:1.7;font-weight:300}
.partners-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:14px;margin-top:32px}
.partner-card{background:var(--white);border-radius:14px;border:1.5px solid var(--border);overflow:hidden;box-shadow:var(--shadow-sm);transition:all .22s;text-align:center}
.partner-card:hover{transform:translateY(-3px);box-shadow:var(--shadow);border-color:var(--green-pale2)}
.partner-logo-wrap{height:88px;display:flex;align-items:center;justify-content:center;background:var(--off-white);overflow:hidden;border-bottom:1px solid var(--border)}
.partner-logo-wrap img{width:100%;height:100%;object-fit:cover}
.partner-logo-placeholder{font-size:34px;opacity:.18}
.partner-body{padding:11px 10px 13px}
.partner-name{font-family:var(--font-body);font-weight:700;font-size:13px;color:var(--ink);margin-bottom:2px}
.partner-type{font-size:11px;color:var(--green);font-weight:600}
.partner-desc{font-size:11px;color:var(--ink-muted);margin-top:3px;line-height:1.5;font-weight:300}
/* Loading screen */
.loading-screen{position:fixed;inset:0;background:#0c1a0c;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999;gap:16px}
.loading-spinner{width:40px;height:40px;border:3px solid rgba(125,216,125,.2);border-top-color:#7dd87d;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-text{font-family:var(--font-body);font-size:13px;color:rgba(255,255,255,.5);font-weight:300}
@media(max-width:900px){
  .founders-grid{grid-template-columns:1fr}
  .admin-wrap{grid-template-columns:1fr}
  .admin-sidebar{flex-direction:row;flex-wrap:wrap;padding:6px 8px;gap:3px;border-right:none;border-bottom:1px solid rgba(255,255,255,.05);overflow-x:auto}
  .admin-sidebar-label{display:none}
  .admin-nav-btn{padding:6px 9px;font-size:12px;flex-shrink:0}
  .admin-content{padding:14px}
  .footer-grid{grid-template-columns:1fr;gap:24px}
  .nav-links{display:none}
  .margin-calc-grid{grid-template-columns:1fr}
  .admin-form-grid{grid-template-columns:1fr}
  .section{padding:32px 16px}
  .stats-row{grid-template-columns:1fr 1fr}
}
@media(max-width:640px){
  .nav{padding:0 12px;height:56px}
  .nav-brand{font-size:18px}
  .hero-wrap{padding:44px 16px 36px}
  .hero-title{font-size:clamp(24px,7.5vw,34px)!important}
  .hero-cta-row{flex-direction:column;align-items:center}
  .hero-cta-row .btn-primary,.hero-cta-row .btn-ghost{width:100%;max-width:300px;justify-content:center}
  .prod-grid{grid-template-columns:1fr 1fr;gap:9px}
  .cat-grid{grid-template-columns:repeat(3,1fr);gap:7px}
  .cart-panel{width:100vw}
  .modal-overlay{padding:10px}
  .modal-box{border-radius:14px;max-height:96vh}
  .steps-section{padding:44px 16px}
  .step-grid{grid-template-columns:1fr 1fr;gap:12px}
  .stats-row{grid-template-columns:1fr 1fr;gap:8px}
  table{min-width:520px}
  .card>div{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .team-group-photo{height:210px}
  .future-grid{grid-template-columns:1fr}
  .partners-grid{grid-template-columns:repeat(2,1fr);gap:10px}
}
`;

// =============================================================================
// SHARED COMPONENTS
// =============================================================================
function Logo({ height=38, style={} }) {
  return <img src={LOGO_SRC} alt="Menamart" style={{ height, width:"auto", objectFit:"contain", ...style }} />;
}
function BrandName() {
  return <span className="nav-brand"><span className="nav-brand-mena">Mena</span><span className="nav-brand-mart">mart</span></span>;
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
      <label className="form-label">{label}</label>
      <div className="photo-upload-area" style={{marginTop:5}}>
        {value ? (
          <div style={{position:"relative",width:"100%"}}>
            <img src={value} alt="preview" style={{width:"100%",height:120,objectFit:"cover",borderRadius:7,display:"block"}} onError={e=>{e.target.style.display="none"}} />
            <button onClick={()=>onChange("")} style={{position:"absolute",top:5,right:5,background:"#DC2626",color:"#fff",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✕</button>
          </div>
        ) : <div style={{fontSize:36,opacity:.2}}>🖼️</div>}
        <button type="button" onClick={()=>ref.current.click()} className="btn-green" style={{width:"auto"}}>📁 Carregar do PC</button>
        <input type="text" value={value&&value.startsWith("data:")?"":value||""} onChange={e=>onChange(e.target.value)} placeholder="ou cole um URL: https://..." style={{width:"100%",padding:"7px 11px",border:"1px solid var(--border)",borderRadius:7,fontFamily:"inherit",fontSize:13,outline:"none"}} />
      </div>
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile} />
    </div>
  );
}
function ProductCard({ product, cartItem, onAdd, onChangeQty }) {
  const inCart = cartItem && cartItem.qty > 0;
  return (
    <div className={`prod-card${product.stock?"":" out-of-stock"}`}>
      <div className="prod-img">
        <img src={product.img} alt={product.name} onError={e=>{e.target.src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80"}} />
        {!product.stock && <div className="oos-badge">Esgotado</div>}
      </div>
      <div className="prod-body">
        <div className="prod-name">{product.name}</div>
        <div className="prod-sub">{product.sub}</div>
        <div className="prod-price">{fmt(product.sellingPrice)}</div>
        <div style={{marginTop:4}}>{product.stock?<span className="stock-yes">✓ Em Stock</span>:<span className="stock-no">✗ Esgotado</span>}</div>
      </div>
      {inCart ? (
        <div className="qty-ctrl">
          <button className="qty-btn" onClick={()=>onChangeQty(product.id,-1)}>−</button>
          <span className="qty-num">{cartItem.qty}</span>
          <button className="qty-btn" onClick={()=>onChangeQty(product.id,1)}>+</button>
        </div>
      ) : (
        <button className="add-btn" onClick={()=>onAdd(product)} disabled={!product.stock}>
          {product.stock?"🛒 Encomendar":"Indisponível"}
        </button>
      )}
    </div>
  );
}
function NavBar({ page, goTo, currentUser, cartCount=0, onCartOpen, onLogout }) {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={()=>goTo("home")}>
        <Logo height={34} />
        <BrandName />
      </div>
      <div className="nav-links">
        <button className={`nav-btn${page==="sobre"?" active":""}`} onClick={()=>goTo("sobre")}>Sobre Nós</button>
        {currentUser && <button className={`nav-btn${page==="catalog"?" active":""}`} onClick={()=>goTo("catalog")}>Catálogo</button>}
        <button className={`nav-btn${page==="contacto"?" active":""}`} onClick={()=>goTo("contacto")}>Contacto</button>
      </div>
      <div className="nav-right">
        {currentUser ? (
          <>
            <span className="user-pill" onClick={()=>goTo("account")}>👤 {currentUser.businessName}</span>
            <button className="cart-btn" onClick={onCartOpen}>🛒 Cesto {cartCount>0&&<span className="cart-count">{cartCount}</span>}</button>
            <button className="btn-outline-nav" onClick={onLogout}>Sair</button>
          </>
        ) : (
          <button className="btn-outline-nav" onClick={()=>goTo("login")}>Entrar →</button>
        )}
      </div>
    </nav>
  );
}
function Footer({ goTo, onSecretClick }) {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand" onClick={onSecretClick}>
              <img src={LOGO_SRC} alt="Menamart" style={{height:26}} />
              <span className="footer-brand-name">Mena<span>mart</span></span>
            </div>
            <p className="footer-desc">Plataforma B2B de abastecimento alimentar para o sector HORECA em Luanda, Angola.</p>
          </div>
          <div>
            <div className="footer-col-title">Empresa</div>
            <span className="footer-link" onClick={()=>goTo("sobre")}>Sobre Nós</span>
            <span className="footer-link" onClick={()=>goTo("contacto")}>Contacto</span>
            <a href={waLink("Olá Menamart! Gostaria de registar a minha empresa na plataforma B2B.")} target="_blank" rel="noreferrer" className="footer-link">💬 Registar Empresa</a>
          </div>
          <div>
            <div className="footer-col-title">Contacto</div>
            <span className="footer-link">📧 menamart.angola@gmail.com</span>
            <span className="footer-link">💬 +244 933 929 233</span>
            <span className="footer-link">📍 Rua de Benguela, São Paulo, Luanda</span>
            <span className="footer-link">🕐 07:00–18:00 (Seg–Sex)</span>
          </div>
        </div>
        <hr className="footer-divider" />
        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Menamart. Todos os direitos reservados.</span>
          <span className="footer-version">v{APP_VERSION} · Firebase</span>
        </div>
      </div>
    </footer>
  );
}

// =============================================================================
// INVOICE MODAL
// =============================================================================
function InvoiceModal({ order, onClose }) {
  const pm = PAYMENT_METHODS.find(m=>m.id===order.paymentMethod);
  const isCredit = CREDIT_METHODS.includes(order.paymentMethod);
  const printInvoice = () => {
    const win = window.open("","_blank","width=800,height=600");
    win.document.write(`<html><head><title>Factura ${order.id}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#0c1a0c;font-size:13px;max-width:740px;margin:0 auto}
      .header{background:#0c1a0c;color:#fff;padding:24px 28px;border-radius:10px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}
      .brand{font-size:26px;font-weight:700}.brand span{color:#ff8040}
      .inv-num{font-size:12px;opacity:.6;margin-top:4px}
      .meta{text-align:right;font-size:12px;opacity:.6;line-height:1.8}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
      .block-label{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b8a6b;margin-bottom:5px}
      .block-val{font-size:13px;font-weight:600;line-height:1.7}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#f0f4f0;padding:8px 12px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-align:left}
      td{padding:9px 12px;border-bottom:1px solid #f0f4f0;font-size:13px}
      .total-row{display:flex;justify-content:space-between;padding:14px 0;border-top:2px solid #0c1a0c;margin-top:4px}
      .total-label{font-weight:700;font-size:14px}
      .total-val{font-size:26px;font-weight:700;color:#1B6B1B}
      .footer-note{background:#f8faf8;padding:14px 16px;border-radius:8px;font-size:11px;color:#6b8a6b;text-align:center;line-height:1.7;margin-top:16px}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="header">
      <div><div class="brand">Mena<span>mart</span></div><div class="inv-num">Factura · ${order.id}</div></div>
      <div class="meta">Data: ${order.date}<br/>Luanda, Angola</div>
    </div>
    <div class="grid">
      <div><div class="block-label">Facturado a</div><div class="block-val">${order.clientName}<br/>${order.clientCode}<br/>${order.address||""}</div></div>
      <div><div class="block-label">Pagamento</div><div class="block-val">${pm?`${pm.label}`:order.paymentMethod}<br/>${order.paymentStatus||""}${isCredit&&order.creditDueDate?`<br/>Vence: ${order.creditDueDate}`:""}</div></div>
    </div>
    <table>
      <thead><tr><th>Produto</th><th style="text-align:center">Qtd.</th><th style="text-align:right">Preço Unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${(order.items||[]).map(i=>`<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">AKZ ${new Intl.NumberFormat("pt-AO").format(i.price)}</td><td style="text-align:right">AKZ ${new Intl.NumberFormat("pt-AO").format(i.total||i.price*i.qty)}</td></tr>`).join("")}</tbody>
    </table>
    <div class="total-row"><span class="total-label">Total</span><span class="total-val">AKZ ${new Intl.NumberFormat("pt-AO").format(Math.round(order.total))}</span></div>
    <div class="footer-note">Menamart Lda · Rua de Benguela, São Paulo, Luanda · menamart.angola@gmail.com · +244 933 929 233<br/>Obrigado pela sua preferência!</div>
    </body></html>`);
    win.document.close();
    setTimeout(()=>win.print(),400);
  };
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style={{maxWidth:580,width:"calc(100vw - 24px)"}}>
        <button className="modal-x dark" onClick={onClose}>✕</button>
        <div style={{padding:"18px 22px 0",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)",paddingBottom:14}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700}}>Factura / Recibo</div>
          <button className="btn-green" onClick={printInvoice}>🖨️ Imprimir / PDF</button>
        </div>
        <div style={{padding:"18px 22px 24px"}}>
          <div style={{background:"#0c1a0c",borderRadius:10,padding:"16px 20px",marginBottom:16,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div><div style={{fontFamily:"var(--font-display)",fontSize:20,color:"#fff",fontWeight:700}}>Mena<span style={{color:"#ff8040"}}>mart</span></div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",fontFamily:"monospace",marginTop:3}}>{order.id}</div></div>
            <div style={{textAlign:"right",fontSize:11,color:"rgba(255,255,255,.55)",lineHeight:1.8}}><div>Data: {order.date}</div><div>Luanda, Angola</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><div style={{fontSize:9,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ink-muted)",marginBottom:5}}>Facturado a</div><div style={{fontSize:13,fontWeight:600,lineHeight:1.7}}>{order.clientName}<br/><span style={{fontFamily:"monospace",color:"var(--green)"}}>{order.clientCode}</span><br/><span style={{fontWeight:300,color:"var(--ink-soft)"}}>{order.address}</span></div></div>
            <div><div style={{fontSize:9,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ink-muted)",marginBottom:5}}>Pagamento</div><div style={{fontSize:13,fontWeight:600,lineHeight:1.7}}>{pm?`${pm.icon} ${pm.label}`:order.paymentMethod}<br/><span style={{fontWeight:300,color:"var(--ink-soft)"}}>{order.paymentStatus}</span>{isCredit&&order.creditDueDate&&<><br/><span style={{color:"#7c3aed",fontSize:12}}>Vence: {order.creditDueDate}</span></>}</div></div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{minWidth:380}}>
              <thead><tr><th>Produto</th><th style={{textAlign:"center"}}>Qtd.</th><th style={{textAlign:"right"}}>Preço</th><th style={{textAlign:"right"}}>Total</th></tr></thead>
              <tbody>{(order.items||[]).map((item,i)=><tr key={i}><td style={{fontWeight:600}}>{item.name}</td><td style={{textAlign:"center"}}>{item.qty}</td><td style={{textAlign:"right",color:"var(--ink-muted)"}}>{fmt(item.price)}</td><td style={{textAlign:"right",fontFamily:"var(--font-display)",color:"var(--green)",fontWeight:600}}>{fmt(item.total||item.price*item.qty)}</td></tr>)}</tbody>
            </table>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderTop:"2px solid var(--ink)",marginTop:4}}>
            <span style={{fontFamily:"var(--font-body)",fontWeight:700,fontSize:14}}>Total</span>
            <span style={{fontFamily:"var(--font-display)",fontSize:24,color:"var(--green)",fontWeight:700}}>{fmt(order.total)}</span>
          </div>
          <div style={{background:"var(--off-white)",borderRadius:9,padding:"10px 13px",marginTop:12,fontSize:11,color:"var(--ink-muted)",textAlign:"center",lineHeight:1.7}}>
            Menamart Lda · Rua de Benguela, São Paulo, Luanda · menamart.angola@gmail.com
          </div>
          <a href={waLink(`📋 Factura *${order.id}*\nCliente: ${order.clientName}\nTotal: ${fmt(order.total)}\nData: ${order.date}`)} target="_blank" rel="noreferrer" className="btn-wa" style={{marginTop:12}}>💬 Enviar via WhatsApp</a>
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
        <Logo height={66} style={{display:"block",margin:"0 auto 22px",mixBlendMode:"luminosity",opacity:.8}} />
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
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(26px,4vw,40px)",color:"var(--ink)",textAlign:"center",marginBottom:10,fontWeight:700}}>Simples, rápido e seguro</h2>
          <p style={{color:"var(--ink-muted)",fontSize:14,textAlign:"center",maxWidth:480,margin:"0 auto 40px",lineHeight:1.75,fontWeight:300}}>Acesso exclusivo para empresas verificadas.</p>
          <div className="step-grid">
            {[{n:1,icon:"💬",title:"Contacte via WhatsApp",desc:"Envie os dados da sua empresa."},{n:2,icon:"✅",title:"Verificação em 24h",desc:"A nossa equipa verifica e aprova."},{n:3,icon:"🔑",title:"Recebe o código",desc:"Código de acesso único via WhatsApp."},{n:4,icon:"🛒",title:"Encomende",desc:"Entre e comece a encomendar."}].map((s,i)=>(
              <div key={i} className="step-card"><div className="step-num">{s.n}</div><div className="step-icon">{s.icon}</div><div className="step-title">{s.title}</div><div className="step-desc">{s.desc}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"var(--off-white)",padding:"60px 24px",borderTop:"1px solid var(--border)"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div className="eyebrow">Porquê a Menamart?</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(24px,4vw,36px)",textAlign:"center",marginBottom:40,fontWeight:700}}>Confiança, Qualidade, Pontualidade</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:18}}>
            {[{icon:"⚡",t:"Entregas Rápidas",d:"07:00–18:00, Segunda a Sexta."},{icon:"✅",t:"Qualidade Verificada",d:"Produtos inspeccionados antes da entrega."},{icon:"🤝",t:"Só Empresas",d:"Acesso restrito a empresas verificadas."},{icon:"💰",t:"Preços Transparentes",d:"Preços justos, sem surpresas."},{icon:"📅",t:"Crédito Disponível",d:"Clientes aprovados pagam a 7 ou 30 dias."},{icon:"📱",t:"Suporte WhatsApp",d:"Resposta em menos de 1 hora."}].map((v,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:22,border:"1px solid var(--border)"}}><div style={{fontSize:26,marginBottom:10}}>{v.icon}</div><div style={{fontFamily:"var(--font-display)",fontSize:16,color:"var(--ink)",marginBottom:6,fontWeight:600}}>{v.t}</div><div style={{fontSize:13,color:"var(--ink-muted)",lineHeight:1.7,fontWeight:300}}>{v.d}</div></div>
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
        <h1 className="hero-title" style={{fontSize:"clamp(26px,5vw,50px)"}}>A equipa por trás da <em>Menamart</em></h1>
        <p className="hero-sub">Dois empreendedores luandenses com uma missão: simplificar o abastecimento alimentar para o sector HORECA em Angola.</p>
      </div>
      <div className="founders-section">
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div className="eyebrow">Os Fundadores</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(22px,4vw,36px)",textAlign:"center",marginBottom:36,fontWeight:700}}>Conheça quem criou a Menamart</h2>
          <div className="founders-grid">
            {[{name:"Fundador 1",role:"Co-Fundador & CEO",title:"Estratégia & Crescimento",bio:"Responsável pela estratégia comercial e expansão da Menamart em Luanda.",contacts:["📱 +244 9XX XXX XXX"],photo:null},{name:"Fundador 2",role:"Co-Fundador & COO",title:"Operações & Logística",bio:"Gere as operações logísticas e a rede de fornecedores em Angola.",contacts:["📱 +244 9XX XXX XXX"],photo:null}].map((f,i)=>(
              <div key={i} className="founder-card">
                <div className="founder-photo-wrap">{f.photo?<img src={f.photo} alt={f.name} />:<div className="founder-photo-placeholder">👤</div>}<div className="founder-role-badge">{f.role}</div></div>
                <div className="founder-body"><div className="founder-name">{f.name}</div><div className="founder-title">{f.title}</div><div className="founder-bio">{f.bio}</div><div className="founder-contacts">{f.contacts.map((c,j)=><span key={j} className="founder-contact-chip">{c}</span>)}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="team-section">
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div className="eyebrow">A Nossa Equipa</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(22px,4vw,34px)",marginBottom:8,fontWeight:700}}>Juntos somos mais fortes</h2>
          <div className="team-group-photo"><div style={{fontSize:80,opacity:.12,color:"#fff"}}>👥</div><div className="team-group-overlay"><div style={{fontFamily:"var(--font-display)",color:"#fff",fontSize:17,fontWeight:600}}>Equipa Menamart — Luanda, 2026</div></div></div>
        </div>
      </div>
      <div style={{background:"#fff",padding:"64px 24px",borderTop:"1px solid var(--border)"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div className="eyebrow">Os Nossos Valores</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(22px,4vw,36px)",textAlign:"center",marginBottom:8,fontWeight:700}}>Missão, Visão & Objectivos</h2>
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
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(22px,4vw,38px)",color:"#fff",textAlign:"center",marginBottom:8,fontWeight:700}}>O Futuro da Menamart</h2>
          <div className="future-grid">
            {[{year:"2026",icon:"📍",title:"Consolidar Luanda",desc:"100 clientes HORECA. Entrega em menos de 4 horas."},{year:"2027",icon:"🚀",title:"Expansão Nacional",desc:"Operações em Benguela, Lubango e Huambo."},{year:"2028",icon:"📱",title:"App Móvel",desc:"Aplicação iOS e Android com rastreamento."},{year:"2029+",icon:"🌍",title:"Liderança CPLP",desc:"Referência B2B alimentar em África lusófona."}].map((f,i)=>(
              <div key={i} className="future-card"><div className="future-year">{f.year} · {f.icon}</div><div className="future-title">{f.title}</div><div className="future-desc">{f.desc}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"var(--off-white)",padding:"64px 24px",borderTop:"1px solid var(--border)"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div className="eyebrow">Parceiros & Fornecedores</div>
          <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(22px,4vw,36px)",textAlign:"center",marginBottom:8,fontWeight:700}}>Com quem trabalhamos</h2>
          <div className="partners-grid">
            {(partners||[]).map((p,i)=>(
              <div key={p.id||i} className="partner-card">
                <div className="partner-logo-wrap">{p.logo?<img src={p.logo} alt={p.name} onError={e=>{e.target.style.display="none"}} />:<div className="partner-logo-placeholder">🏢</div>}</div>
                <div className="partner-body"><div className="partner-name">{p.name}</div><div className="partner-type">{p.type}</div><div className="partner-desc">{p.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
      <div className="hero-wrap" style={{padding:"56px 24px 46px"}}>
        <div className="hero-badge">📞 Contacto</div>
        <h1 className="hero-title" style={{fontSize:"clamp(26px,4vw,42px)"}}>Fale connosco</h1>
        <p className="hero-sub">Estamos aqui para ajudar o seu negócio</p>
      </div>
      <div className="section" style={{maxWidth:900}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:22,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[{icon:"💬",t:"WhatsApp",v:"+244 933 929 233",s:"Resposta < 1 hora"},{icon:"📧",t:"Email",v:"menamart.angola@gmail.com",s:"Resposta < 4 horas"},{icon:"📍",t:"Localização",v:"Rua de Benguela, São Paulo, Luanda",s:""},{icon:"🕐",t:"Horário",v:"07:00 – 18:00",s:"Segunda a Sexta-feira"}].map((c,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:11,padding:16,boxShadow:"var(--shadow-sm)",border:"1px solid var(--border)",display:"flex",gap:12}}>
                <div style={{width:40,height:40,background:"var(--green-pale)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</div>
                <div><div style={{fontFamily:"var(--font-body)",fontWeight:700,fontSize:11,color:"var(--ink-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:1}}>{c.t}</div><div style={{fontFamily:"var(--font-display)",fontSize:15,color:"var(--green)",fontWeight:600}}>{c.v}</div>{c.s&&<div style={{fontSize:11,color:"var(--ink-muted)",marginTop:1}}>{c.s}</div>}</div>
              </div>
            ))}
            <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="btn-wa">💬 Falar no WhatsApp</a>
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:26,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
            {sent?(<div style={{textAlign:"center",padding:"36px 0"}}><div style={{fontSize:48,marginBottom:14}}>✅</div><div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--green)",marginBottom:8,fontWeight:600}}>Mensagem Enviada!</div><p style={{color:"var(--ink-muted)",fontSize:13,marginBottom:18,fontWeight:300}}>A nossa equipa responderá em breve.</p><button className="btn-green" onClick={()=>setSent(false)}>Nova Mensagem</button></div>):(
              <>
                <div style={{fontFamily:"var(--font-display)",fontSize:20,color:"var(--ink)",marginBottom:18,paddingBottom:12,borderBottom:"1px solid var(--border)",fontWeight:600}}>Enviar Mensagem</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div className="admin-form-field"><label>Nome *</label><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
                    <div className="admin-form-field"><label>Empresa</label><input type="text" value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} /></div>
                  </div>
                  <div className="admin-form-field"><label>Assunto</label><select value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>{["Encomenda","Parceria","Reclamação","Informação Geral","Outro"].map(t=><option key={t}>{t}</option>)}</select></div>
                  <div className="admin-form-field"><label>Mensagem *</label><textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={4} style={{resize:"vertical"}} /></div>
                  <button onClick={submit} className="btn-green" style={{width:"100%",padding:12,fontSize:14}}>Enviar via WhatsApp →</button>
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

// =============================================================================
// LOGIN
// =============================================================================
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
    else{
      const codeOk=clients.find(c=>c.approved&&c.code.toUpperCase()===cd);
      if(!codeOk)setError("Empresa ou código não encontrado. Registe-se via WhatsApp.");
      else setError("Nome da empresa não corresponde ao código.");
    }
  };
  const confirm=()=>{if(!addr.trim()){setError("Indique o endereço de entrega.");return;}onLogin({...found,address:addr.trim()});};
  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style={{maxWidth:430,width:"calc(100vw - 28px)"}}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <div className="modal-head"><img src={LOGO_SRC} alt="Menamart" /><h2>{step===1?"Entrar na Plataforma":"Bem-vindo!"}</h2><p>{step===1?"Acesso exclusivo para empresas verificadas":`${found?.businessName} — confirme o endereço`}</p></div>
        <div className="modal-body">
          {error&&<div className="modal-error">⚠️ {error}</div>}
          {step===1&&(<>
            <div className="form-field"><label className="form-label">Nome da Empresa</label><input className="form-input" type="text" value={companyName} onChange={e=>{setCompanyName(e.target.value);setError("");}} placeholder="Ex: Hotel Intercontinental" autoFocus onKeyDown={e=>e.key==="Enter"&&check()} /></div>
            <div className="form-field"><label className="form-label">Código de Acesso</label><input className="form-input" type="text" value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setError("");}} placeholder="Ex: MN-001" style={{fontFamily:"monospace",fontSize:20,fontWeight:900,textAlign:"center",letterSpacing:".15em"}} onKeyDown={e=>e.key==="Enter"&&check()} /></div>
            <button className="modal-submit" onClick={check}>Verificar Acesso →</button>
            <div style={{textAlign:"center",marginTop:12,fontSize:13,color:"var(--ink-muted)"}}>Não tem acesso? <a href={waLink("Olá Menamart! Gostaria de me registar.")} target="_blank" rel="noreferrer" style={{color:"var(--green)",fontWeight:700,textDecoration:"none"}}>Registar via WhatsApp</a></div>
            <a href={waLink("Olá Menamart! Não consigo entrar. Por favor ajudem!")} target="_blank" rel="noreferrer" className="btn-wa" style={{marginTop:10}}>💬 Preciso de ajuda</a>
          </>)}
          {step===2&&(<>
            <div style={{background:"var(--green-pale)",border:"1px solid var(--green-pale2)",borderRadius:10,padding:"13px 15px",marginBottom:16,display:"flex",gap:11,alignItems:"center"}}>
              <div style={{fontSize:28}}>{found?.type==="Hotel"?"🏨":found?.type==="Restaurante"?"🍽️":"🏢"}</div>
              <div><div style={{fontFamily:"var(--font-body)",fontWeight:800,color:"var(--green)",fontSize:15}}>{found?.businessName}</div><div style={{fontSize:12,color:"var(--ink-muted)",marginTop:2}}>{found?.type} · <strong style={{fontFamily:"monospace"}}>{found?.code}</strong></div></div>
            </div>
            <div className="form-field"><label className="form-label">Endereço de Entrega</label><input className="form-input" type="text" value={addr} onChange={e=>{setAddr(e.target.value);setError("");}} placeholder="Bairro, Município, Luanda" autoFocus onKeyDown={e=>e.key==="Enter"&&confirm()} /></div>
            <button className="modal-submit" onClick={confirm}>Confirmar & Entrar →</button>
            <button className="modal-back" onClick={()=>{setStep(1);setError("");}}>← Voltar</button>
          </>)}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BUYER CATALOG
// =============================================================================
function BuyerCatalog({ products, categories, currentUser, settings, onNewOrder, goTo, onLogout, onSecretClick }) {
  const [cart,setCart]=useState([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [activeCat,setActiveCat]=useState("Todos");
  const [search,setSearch]=useState("");
  const [view,setView]=useState("home");
  const [success,setSuccess]=useState(null);
  const [payMethod,setPayMethod]=useState(settings?.defaultMethod||"on_delivery");

  const creditApproved=(settings?.creditClients||[]).includes(currentUser.id||currentUser._id);
  const acceptedMethods=(settings?.acceptedMethods||["on_delivery"]).filter(m=>CREDIT_METHODS.includes(m)?creditApproved:true);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return products.filter(p=>{const catOk=activeCat==="Todos"||p.category===activeCat;if(!q)return catOk;return catOk&&(p.name.toLowerCase().includes(q)||p.sub.toLowerCase().includes(q));});},[products,activeCat,search]);
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

  const handleCheckout=async()=>{
    const orderId="ORD-"+String(Math.floor(Math.random()*90000)+10000);
    const order={
      id:orderId,clientId:currentUser.id||currentUser._id,clientName:currentUser.businessName,
      clientPhone:(currentUser.phone||"").replace(/\D/g,""),clientCode:currentUser.code,
      clientEmail:currentUser.email||"",total:cartTotal,address:currentUser.address,
      date:new Date().toISOString().split("T")[0],status:"Pending",paymentMethod:payMethod,
      paymentStatus:isCredit?`Crédito — vence ${dueDate}`:(payMethod==="prepaid"?"Pending Payment":"Pay on Delivery"),
      creditDueDate:dueDate||"",
      items:cart.map(i=>({name:i.name,qty:i.qty,price:i.sellingPrice,total:i.sellingPrice*i.qty})),
    };
    await onNewOrder(order);
    // WhatsApp notification to owner
    notifyWA(`🛒 *Nova Encomenda — Menamart*\n\nCliente: *${order.clientName}* (${order.clientCode})\nID: *${orderId}*\nTotal: *${fmt(cartTotal)}*\nPagamento: ${PAYMENT_METHODS.find(m=>m.id===payMethod)?.label}\n${dueDate?`Prazo crédito: ${dueDate}\n`:""}Entrega: ${order.address}\n\nItens:\n${cart.map(i=>`• ${i.name} x${i.qty} = ${fmt(i.sellingPrice*i.qty)}`).join("\n")}`);
    setSuccess({id:orderId,total:cartTotal,payMethod,dueDate});
    setCart([]);setCartOpen(false);
  };

  useEffect(()=>{if(!cartOpen)return;const h=e=>{if(e.key==="Escape")setCartOpen(false);};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[cartOpen]);
  const catNames=["Todos",...categories.map(c=>c.name)];
  const selectedPay=PAYMENT_METHODS.find(m=>m.id===payMethod);

  return (
    <>
      <NavBar page="catalog" goTo={goTo} currentUser={currentUser} cartCount={cartCount} onCartOpen={()=>setCartOpen(true)} onLogout={onLogout} />
      {view==="home"?(
        <div style={{background:"var(--off-white)"}}>
          <div style={{background:"#0c1a0c",padding:"40px 24px 32px",textAlign:"center"}}>
            <div style={{fontSize:13,fontFamily:"var(--font-body)",fontWeight:500,color:"rgba(255,255,255,.6)",marginBottom:7}}>Bem-vindo, <strong style={{color:"#7dd87d"}}>{currentUser.businessName}</strong></div>
            <h1 style={{fontFamily:"var(--font-display)",fontSize:"clamp(20px,4vw,34px)",color:"#fff",marginBottom:16,fontWeight:700}}>O que procura hoje?</h1>
            <div style={{display:"flex",maxWidth:460,margin:"0 auto",background:"rgba(255,255,255,.11)",borderRadius:10,overflow:"hidden",border:"1px solid rgba(255,255,255,.16)"}}>
              <input style={{flex:1,padding:"12px 16px",border:"none",background:"none",fontFamily:"inherit",fontSize:14,color:"#fff",outline:"none"}} placeholder="Pesquisar produtos..." value={search} onChange={e=>{setSearch(e.target.value);setView("catalog");}} />
              <button style={{background:"rgba(255,255,255,.1)",border:"none",padding:"0 18px",cursor:"pointer",fontSize:16,color:"rgba(255,255,255,.7)"}}>🔍</button>
            </div>
          </div>
          <div className="section">
            <div className="section-header"><div className="section-title">Categorias</div><span className="section-link" onClick={()=>setView("catalog")}>Ver tudo →</span></div>
            <div className="cat-grid">{categories.map(c=><div key={c.id||c.name} className="cat-card" onClick={()=>{setActiveCat(c.name);setView("catalog");}}><img src={c.img} alt={c.name} onError={e=>{e.target.style.display="none";}} /><div className="cat-card-label">{c.name}</div></div>)}</div>
          </div>
          <div className="section" style={{paddingTop:0}}>
            <div className="section-header"><div className="section-title">Destaques</div><span className="section-link" onClick={()=>setView("catalog")}>Ver todos →</span></div>
            <div className="prod-grid">{products.slice(0,8).map(p=><ProductCard key={p.id} product={p} cartItem={cart.find(i=>i.id===p.id)} onAdd={addItem} onChangeQty={changeQty} />)}</div>
          </div>
        </div>
      ):(
        <div style={{background:"var(--off-white)"}}>
          <div className="catalog-bar"><button className="back-btn" onClick={()=>{setSearch("");setActiveCat("Todos");setView("home");}}>← Início</button><div className="catalog-search"><input placeholder="Pesquisar..." value={search} onChange={e=>setSearch(e.target.value)} /><button>🔍</button></div></div>
          <div className="section">
            <div className="pills" style={{marginBottom:20}}>{catNames.map(c=><button key={c} className={`pill${activeCat===c?" active":""}`} onClick={()=>setActiveCat(c)}>{c}</button>)}</div>
            {filtered.length===0?(<div style={{textAlign:"center",padding:"52px 0",color:"var(--ink-muted)"}}><div style={{fontSize:44,marginBottom:10}}>🔍</div><div style={{fontFamily:"var(--font-body)",fontWeight:700}}>Nenhum produto encontrado</div>{search&&<span style={{color:"var(--green)",cursor:"pointer",fontWeight:700}} onClick={()=>{setSearch("");setActiveCat("Todos");}}>Limpar</span>}</div>):(
              <div className="prod-grid">{filtered.map(p=><ProductCard key={p.id} product={p} cartItem={cart.find(i=>i.id===p.id)} onAdd={addItem} onChangeQty={changeQty} />)}</div>
            )}
          </div>
        </div>
      )}
      {cartCount>0&&!cartOpen&&<button className="float-cart" onClick={()=>setCartOpen(true)}>🛒 {cartCount} {cartCount===1?"item":"itens"} · {fmt(cartTotal)}</button>}
      {cartOpen&&(<>
        <div className="cart-overlay" onClick={()=>setCartOpen(false)} />
        <div className="cart-panel">
          <div className="cart-head"><span className="cart-head-title">Cesto {cartCount>0&&<span className="cart-badge">{cartCount}</span>}</span><button className="cart-close-btn" onClick={()=>setCartOpen(false)}>✕</button></div>
          {cart.length===0?(<div className="cart-empty-state"><div style={{fontSize:42,opacity:.18}}>🛒</div><div style={{fontFamily:"var(--font-body)",fontWeight:700}}>Cesto vazio</div></div>):(
            <div className="cart-items-scroll">{cart.map(item=>(
              <div key={item.id} className="cart-row">
                <img className="cart-row-img" src={item.img} alt={item.name} onError={e=>{e.target.style.display="none";}} />
                <div><div className="cart-row-name">{item.name}</div><div className="cart-row-unit">{fmt(item.sellingPrice)} / un.</div></div>
                <div className="cart-row-qty-ctrl"><button className="cqb" onClick={()=>changeQty(item.id,-1)}>−</button><span className="cqn">{item.qty}</span><button className="cqb" onClick={()=>changeQty(item.id,1)}>+</button></div>
                <div className="cart-row-line">{fmt(item.sellingPrice*item.qty)}</div>
                <button className="cart-row-del" onClick={()=>removeItem(item.id)}>✕</button>
              </div>
            ))}</div>
          )}
          <div className="cart-footer">
            <div className="mov-bar-wrap">
              <div className="mov-bar-labels"><span>Mínimo de encomenda</span><strong style={{fontFamily:"var(--font-display)",fontSize:13}}>{fmt(MOV)}</strong></div>
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
                {payMethod==="multicaixa"&&<div className="pay-info" style={{marginTop:8,background:"#fff7ed"}}>📱 Multicaixa: <strong style={{fontFamily:"monospace"}}>{settings?.multicaixaRef}</strong></div>}
                {isCredit&&<div className="pay-info" style={{marginTop:8,background:"#faf5ff",color:"#5b21b6"}}>📅 <strong>Crédito {creditDays} dias</strong> — vence em <strong>{dueDate}</strong></div>}
              </div>
            )}
            <div className="cart-delivery-note"><span>🚚</span><span>Entrega: <strong>{currentUser.address}</strong></span></div>
            <button className={`cart-checkout-btn${!movMet||!cart.length?" not-ready":isCredit?" credit-ready":" ready"}`} onClick={movMet&&cart.length?handleCheckout:undefined} disabled={!movMet||!cart.length}>
              {!movMet?`Mínimo: ${fmt(MOV)}`:`Confirmar · ${selectedPay?.icon} ${selectedPay?.label}`}
            </button>
          </div>
        </div>
      </>)}
      {success&&(
        <div className="modal-overlay">
          <div className="success-modal">
            <button className="modal-x dark" onClick={()=>setSuccess(null)}>✕</button>
            <div className="success-icon">✅</div>
            <div className="success-title">Encomenda Enviada!</div>
            <div className="success-sub">Recebemos o seu pedido. A equipa confirmará em breve via WhatsApp.</div>
            <div className="order-id-box">#{success.id}</div>
            {isCredit&&<div className="pay-info" style={{textAlign:"left",marginBottom:14,background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:9,padding:"10px 14px",fontSize:13,color:"#5b21b6"}}>📅 Prazo de pagamento: <strong>{success.dueDate}</strong></div>}
            <a href={waLink(`Olá Menamart! Fiz encomenda *${success.id}*. Total: *${fmt(success.total)}*. Aguardo confirmação!`)} target="_blank" rel="noreferrer" className="btn-wa" style={{marginBottom:10}}>💬 Confirmar via WhatsApp</a>
            <button className="btn-green" style={{width:"100%",padding:12}} onClick={()=>setSuccess(null)}>Voltar ao Catálogo</button>
          </div>
        </div>
      )}
      <Footer goTo={goTo} onSecretClick={onSecretClick} />
    </>
  );
}

// =============================================================================
// CLIENT ACCOUNT
// =============================================================================
function ClientAccount({ currentUser, setCurrentUser, orders, feedbacks, setFeedbacks, goTo, onLogout, onSecretClick }) {
  const [editing,setEditing]=useState(false);
  const [showFeedback,setShowFeedback]=useState(false);
  const [feedForm,setFeedForm]=useState({type:"Sugestão",message:"",priority:"Normal"});
  const [feedSent,setFeedSent]=useState(false);
  const [form,setForm]=useState({businessName:currentUser.businessName,contact:currentUser.contact,phone:currentUser.phone||"",email:currentUser.email||"",address:currentUser.address||""});
  const myOrders=orders.filter(o=>o.clientId===(currentUser.id||currentUser._id)||o.clientCode===currentUser.code);
  const totalSpent=myOrders.reduce((s,o)=>s+o.total,0);
  const save=async()=>{
    try{await updDoc("clients",currentUser.id||currentUser._id,form);}catch(e){console.error(e);}
    setCurrentUser(u=>({...u,...form}));setEditing(false);
  };
  const submitFeedback=async()=>{
    if(!feedForm.message.trim())return;
    const fb={clientId:currentUser.id||currentUser._id,clientName:currentUser.businessName,clientCode:currentUser.code,type:feedForm.type,priority:feedForm.priority,message:feedForm.message,date:new Date().toISOString().split("T")[0],status:"Novo"};
    try{await addDoc(col("feedbacks"),fb);}catch(e){console.error(e);}
    setFeedSent(true);
    setTimeout(()=>{setFeedSent(false);setShowFeedback(false);setFeedForm({type:"Sugestão",message:"",priority:"Normal"});},2200);
  };
  useEffect(()=>{if(!showFeedback)return;const h=e=>{if(e.key==="Escape")setShowFeedback(false);};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[showFeedback]);
  return (
    <div style={{background:"var(--off-white)",minHeight:"60vh"}}>
      <NavBar page="account" goTo={goTo} currentUser={currentUser} onCartOpen={()=>{}} onLogout={onLogout} />
      <div style={{background:"var(--green-dark)",padding:"40px 24px 32px"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <h1 style={{fontFamily:"var(--font-display)",fontSize:"clamp(18px,4vw,30px)",color:"#fff",marginBottom:10,fontWeight:700}}>{currentUser.businessName}</h1>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[`🔑 ${currentUser.code}`,`📦 ${myOrders.length} encomendas`,`💰 ${fmt(totalSpent)}`].map((t,i)=><span key={i} style={{background:"rgba(255,255,255,.1)",borderRadius:100,padding:"4px 12px",fontSize:12,fontFamily:"var(--font-body)",fontWeight:500,color:"rgba(255,255,255,.7)"}}>{t}</span>)}</div>
        </div>
      </div>
      <div className="section" style={{maxWidth:900}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:22,alignItems:"start"}}>
          <div>
            <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"var(--shadow-sm)",border:"1px solid var(--border)",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:11,borderBottom:"1px solid var(--border)"}}>
                <div style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:600}}>Dados da Empresa</div>
                {!editing&&<button className="btn-sm btn-gray" onClick={()=>setEditing(true)}>✏️ Editar</button>}
              </div>
              {editing?(<div style={{display:"flex",flexDirection:"column",gap:11}}>{[["Nome","businessName"],["Responsável","contact"],["Telefone","phone"],["Email","email"],["Endereço","address"]].map(([l,k])=>(<div key={k}><label className="form-label">{l}</label><input type="text" className="form-input" value={form[k]||""} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} /></div>))}<div style={{display:"flex",gap:7}}><button className="btn-green" style={{flex:1,padding:9}} onClick={save}>✅ Guardar</button><button className="btn-sm btn-gray" style={{padding:"9px 14px"}} onClick={()=>setEditing(false)}>Cancelar</button></div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:9}}>{[["🏢","Empresa",currentUser.businessName],["👤","Responsável",currentUser.contact],["📱","Telefone",currentUser.phone],["📧","Email",currentUser.email||"—"],["📍","Entrega",currentUser.address]].map(([icon,label,value],i)=>(
                  <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:"1px solid var(--off-white)"}}><span style={{fontSize:15,flexShrink:0}}>{icon}</span><div><div style={{fontFamily:"var(--font-body)",fontSize:9,fontWeight:700,color:"var(--ink-muted)",textTransform:"uppercase",letterSpacing:".08em"}}>{label}</div><div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginTop:1}}>{value}</div></div></div>
                ))}</div>
              )}
            </div>
            <button className="btn-outline" style={{width:"100%",padding:11,marginBottom:11,display:"flex",alignItems:"center",justifyContent:"center",gap:7}} onClick={()=>setShowFeedback(true)}>💡 Sugerir Melhoria</button>
            <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:11,padding:"13px 15px",textAlign:"center"}}><div style={{fontFamily:"var(--font-body)",fontSize:11,fontWeight:700,color:"#92400E",marginBottom:5,textTransform:"uppercase",letterSpacing:".08em"}}>Código de acesso</div><div style={{fontFamily:"monospace",fontSize:22,fontWeight:900,color:"#78350F",letterSpacing:".12em"}}>{currentUser.code}</div></div>
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"var(--shadow-sm)",border:"1px solid var(--border)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:11,borderBottom:"1px solid var(--border)"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:600}}>Histórico de Encomendas</div>
              <span style={{fontFamily:"var(--font-display)",fontSize:15,color:"var(--green)",fontWeight:600}}>{fmt(totalSpent)}</span>
            </div>
            {myOrders.length===0?(<div style={{textAlign:"center",padding:"28px 0",color:"var(--ink-muted)"}}><div style={{fontSize:38,marginBottom:9}}>📦</div><div style={{fontFamily:"var(--font-body)",fontWeight:700,marginBottom:11}}>Ainda sem encomendas</div><button className="btn-green" onClick={()=>goTo("catalog")}>Ir ao Catálogo →</button></div>):(
              <div style={{display:"flex",flexDirection:"column",gap:9}}>{myOrders.map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);return(<div key={o.id} style={{background:"var(--off-white)",borderRadius:9,padding:"11px 13px",border:"1px solid var(--border)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><strong style={{fontFamily:"monospace",color:"var(--ink)",fontSize:13}}>{o.id}</strong><span style={{background:`${c}18`,color:c,padding:"2px 9px",borderRadius:100,fontFamily:"var(--font-body)",fontSize:11,fontWeight:700}}>{o.status}</span></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"var(--ink-muted)"}}>{o.date}{pm&&` · ${pm.icon} ${pm.label}`}</span><span style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:14,fontWeight:600}}>{fmt(o.total)}</span></div></div>);})}</div>
            )}
          </div>
        </div>
      </div>
      {showFeedback&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowFeedback(false);}}>
          <div className="modal-box" style={{maxWidth:440}}>
            <button className="modal-x" onClick={()=>setShowFeedback(false)}>✕</button>
            <div className="modal-head"><h2>💡 Sugerir Melhoria</h2><p>A sua opinião melhora a Menamart</p></div>
            <div className="modal-body">
              {feedSent?(<div style={{textAlign:"center",padding:"28px 0"}}><div style={{fontSize:44,marginBottom:10}}>🙏</div><div style={{fontFamily:"var(--font-display)",fontSize:20,color:"var(--green)",fontWeight:600}}>Obrigado!</div></div>):(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:12}}>
                    <div className="admin-form-field"><label>Tipo</label><select value={feedForm.type} onChange={e=>setFeedForm(f=>({...f,type:e.target.value}))}>{["Sugestão","Erro/Bug","Novo Produto","Melhoria de Design","Outro"].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div className="admin-form-field"><label>Prioridade</label><select value={feedForm.priority} onChange={e=>setFeedForm(f=>({...f,priority:e.target.value}))}>{["Normal","Importante","Urgente"].map(t=><option key={t}>{t}</option>)}</select></div>
                  </div>
                  <div className="admin-form-field" style={{marginBottom:14}}><label>Sugestão *</label><textarea value={feedForm.message} onChange={e=>setFeedForm(f=>({...f,message:e.target.value}))} rows={4} style={{resize:"vertical",padding:"9px 12px",border:"1px solid var(--border)",borderRadius:8,fontFamily:"inherit",fontSize:13,outline:"none",width:"100%"}} /></div>
                  <button className="modal-submit" onClick={submitFeedback}>Enviar Sugestão</button>
                  <button className="modal-back" onClick={()=>setShowFeedback(false)}>Cancelar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <Footer goTo={goTo} onSecretClick={onSecretClick} />
    </div>
  );
}

// =============================================================================
// ADMIN PAGES
// =============================================================================
function AdminDashboard({ products, orders, clients, feedbacks }) {
  const revenue=orders.filter(o=>o.status==="Delivered").reduce((s,o)=>s+o.total,0);
  const pending=orders.filter(o=>o.status==="Pending").length;
  const creditOrders=orders.filter(o=>CREDIT_METHODS.includes(o.paymentMethod));
  const overdueCredit=creditOrders.filter(o=>{if(!o.creditDueDate||o.paymentStatus==="Paid")return false;try{return new Date(o.creditDueDate.split("/").reverse().join("-"))<new Date();}catch{return false;}});
  const newFeedbacks=feedbacks.filter(f=>f.status==="Novo").length;
  return (
    <div>
      <div className="admin-title">Painel de Controlo</div>
      <div className="admin-sub">Menamart v{APP_VERSION} · Firebase · © 2026 Todos os direitos reservados.</div>
      <div className="stats-row">
        {[{icon:"💰",v:fmt(revenue),l:"Receita Total",n:"Entregues"},{icon:"🛒",v:orders.length,l:"Encomendas",n:`${pending} pendentes`},{icon:"👥",v:clients.length,l:"Clientes",n:"Verificados"},{icon:"📦",v:products.filter(p=>p.stock).length,l:"Em Stock",n:`${products.filter(p=>!p.stock).length} esgotados`},{icon:"📅",v:creditOrders.length,l:"Crédito",n:`${overdueCredit.length} em atraso`},{icon:"💡",v:newFeedbacks,l:"Sugestões",n:"Novas"}].map((s,i)=>(
          <div key={i} className="stat-card"><div className="stat-icon">{s.icon}</div><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div><div className="stat-note">{s.n}</div></div>
        ))}
      </div>
      {overdueCredit.length>0&&<div className="credit-box" style={{marginBottom:16}}>⚠️ <strong>{overdueCredit.length} encomenda(s) a crédito em atraso!</strong></div>}
      <div className="card">
        <div className="card-header"><div className="card-title">Encomendas Recentes</div></div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Estado</th><th>Data</th></tr></thead>
            <tbody>{orders.slice(0,12).map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);const isC=CREDIT_METHODS.includes(o.paymentMethod);return(<tr key={o.id}><td><strong style={{fontFamily:"monospace"}}>{o.id}</strong></td><td style={{fontWeight:700}}>{o.clientName}</td><td style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:14,fontWeight:600}}>{fmt(o.total)}</td><td><span className={`tag${isC?" tag-credit":""}`}>{pm?`${pm.icon} ${pm.label}`:"—"}</span>{isC&&o.creditDueDate&&<div style={{fontSize:10,color:"#5b21b6",marginTop:2}}>Vence: {o.creditDueDate}</div>}</td><td><span className="status-badge" style={{background:`${c}18`,color:c}}><span className="status-dot" style={{background:c}} />{o.status}</span></td><td style={{fontSize:12}}>{o.date}</td></tr>);})}</tbody>
          </table>
        </div>
      </div>
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
  const remove=async id=>{if(window.confirm("Remover cliente?"))try{await delDoc("clients",id);}catch(e){console.error(e);}};
  const clientTotal=id=>orders.filter(o=>o.clientId===id||o.clientCode===clients.find(c=>(c.id||c._id)===id)?.code).reduce((s,o)=>s+o.total,0);
  const clientOrders=id=>orders.filter(o=>o.clientId===id||o.clientCode===clients.find(c=>(c.id||c._id)===id)?.code);
  const toggleCredit=async clientId=>{
    const current=settings?.creditClients||[];
    const updated=current.includes(clientId)?current.filter(id=>id!==clientId):[...current,clientId];
    try{await setDoc(doc(db,"settings","main"),{...settings,creditClients:updated});}catch(e){console.error(e);}
    const client=clients.find(c=>(c.id||c._id)===clientId);
    if(client&&!current.includes(clientId)){
      const phone=(client.phone||"").replace(/\D/g,"");
      window.open(waLink(`✅ *Crédito Aprovado — Menamart*\n\nOlá ${client.businessName}!\nA sua conta foi aprovada para pagamentos a crédito (7 ou 30 dias).\n_Equipa Menamart_`,phone||WA_NUMBER),"_blank");
    }
  };
  const sendWelcome=c=>{const phone=(c.phone||"").replace(/\D/g,"");window.open(waLink(`✅ *Bem-vindo à Menamart!*\n\nOlá *${c.contact}* (${c.businessName})!\n\n🔑 Código: \`${c.code}\`\n\n_Equipa Menamart_`,phone||WA_NUMBER),"_blank");};
  const activeClient=showOrders?clients.find(c=>(c.id||c._id)===showOrders):null;
  const activeOrders=showOrders?clientOrders(showOrders):[];
  return (
    <div>
      <div className="admin-title">Gestão de Clientes</div>
      <div className="admin-sub">Dados guardados automaticamente no Firebase.</div>
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
          <div style={{display:"flex",gap:9,marginTop:14}}>
            <button className="btn-green" onClick={save} disabled={saving}>{saving?"A guardar...":editId?"Guardar":"Adicionar"}</button>
            <button className="btn-sm btn-gray" style={{padding:"9px 16px"}} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}
      {showOrders&&activeClient&&(
        <div className="form-section">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:"1px solid var(--border)"}}>
            <div><div className="form-section-title" style={{marginBottom:2}}>📦 Encomendas de {activeClient.businessName}</div><div style={{fontSize:12,color:"var(--ink-muted)"}}>Total: <strong style={{color:"var(--green)"}}>{fmt(clientTotal(showOrders))}</strong></div></div>
            <button className="btn-sm btn-gray" onClick={()=>setShowOrders(null)}>✕ Fechar</button>
          </div>
          {activeOrders.length===0?(<div style={{textAlign:"center",padding:"24px",color:"var(--ink-muted)"}}><div style={{fontSize:32,marginBottom:8}}>📦</div><div>Nenhuma encomenda ainda</div></div>):(
            <div style={{overflowX:"auto"}}>
              <table>
                <thead><tr><th>ID</th><th>Data</th><th>Pagamento</th><th>Total</th><th>Estado</th><th>Factura</th></tr></thead>
                <tbody>{activeOrders.map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);const isC=CREDIT_METHODS.includes(o.paymentMethod);return(<tr key={o.id}><td><strong style={{fontFamily:"monospace"}}>{o.id}</strong></td><td style={{fontSize:12}}>{o.date}</td><td><span className={`tag${isC?" tag-credit":""}`}>{pm?`${pm.icon} ${pm.label}`:"—"}</span>{isC&&o.creditDueDate&&<div style={{fontSize:10,color:"#5b21b6",marginTop:2}}>Vence: {o.creditDueDate}</div>}</td><td style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:14,fontWeight:600}}>{fmt(o.total)}</td><td><span className="status-badge" style={{background:`${c}18`,color:c}}>{o.status}</span></td><td><button className="btn-sm btn-gray" onClick={()=>setInvoiceOrder(o)}>🧾</button></td></tr>);})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="card">
        <div className="card-header"><div className="card-title">Clientes ({clients.length})</div><button className="btn-green btn-sm" onClick={openNew}>+ Novo</button></div>
        {clients.length===0?(<div style={{padding:"44px 24px",textAlign:"center",color:"var(--ink-muted)"}}><div style={{fontSize:44,marginBottom:10}}>👥</div><div style={{fontFamily:"var(--font-body)",fontWeight:700,marginBottom:7}}>Ainda sem clientes</div><button className="btn-green" onClick={openNew}>+ Registar Primeiro Cliente</button></div>):(
          <div style={{overflowX:"auto"}}>
            <table>
              <thead><tr><th>Código</th><th>Empresa</th><th>Tipo</th><th>Contacto</th><th>Total</th><th>Crédito</th><th>Acções</th></tr></thead>
              <tbody>{clients.map(c=>{const id=c.id||c._id;const hasCredit=creditClients.includes(id);return(
                <tr key={id}>
                  <td><div style={{background:"var(--green-pale)",border:"1.5px solid var(--green-light)",borderRadius:8,padding:"5px 10px",textAlign:"center",minWidth:76,display:"inline-block"}}><div style={{fontFamily:"monospace",color:"var(--green)",fontSize:14,fontWeight:900}}>{c.code}</div></div></td>
                  <td><div style={{fontWeight:700,fontSize:13}}>{c.businessName}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{c.phone}</div></td>
                  <td><span className="tag">{c.type}</span></td>
                  <td style={{fontWeight:600,fontSize:13}}>{c.contact}</td>
                  <td><div style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:13,fontWeight:600}}>{fmt(clientTotal(id))}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{clientOrders(id).length} enc.</div></td>
                  <td><label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><span className="toggle"><input type="checkbox" checked={hasCredit} onChange={()=>toggleCredit(id)} /><span className="toggle-slider" /></span><span style={{fontSize:11,fontWeight:700,color:hasCredit?"#5b21b6":"var(--ink-muted)"}}>{hasCredit?"Activo":"Off"}</span></label></td>
                  <td><div style={{display:"flex",gap:4}}><button className="btn-sm" style={{background:"#3B82F6",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}} onClick={()=>setShowOrders(showOrders===id?null:id)}>📦 {clientOrders(id).length}</button><button className="btn-sm" style={{background:"#25D366",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}} onClick={()=>sendWelcome(c)}>💬</button><button className="btn-sm btn-gray" onClick={()=>openEdit(c)}>✏️</button><button className="btn-sm btn-red" onClick={()=>remove(id)}>🗑️</button></div></td>
                </tr>
              );})}</tbody>
            </table>
          </div>
        )}
      </div>
      <div className="info-box">☁️ Todos os dados são guardados automaticamente no Firebase. Clique 📦 para ver encomendas de cada cliente.</div>
      {invoiceOrder&&<InvoiceModal order={invoiceOrder} onClose={()=>setInvoiceOrder(null)} />}
    </div>
  );
}

function AdminProducts({ products, categories }) {
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const defCat=categories.length>0?categories[0].name:"";
  const empty={name:"",sub:"",category:defCat,costPrice:"",sellingPrice:"",img:"",stock:true};
  const [form,setForm]=useState(empty);
  const [saving,setSaving]=useState(false);
  const [calc,setCalc]=useState({cost:"",pct:""});
  const calcResult=calc.cost&&calc.pct?parseFloat(calc.cost)*(1+parseFloat(calc.pct)/100):null;
  const openNew=()=>{setForm({...empty,category:defCat});setEditId(null);setShowForm(true);};
  const openEdit=p=>{setForm({name:p.name,sub:p.sub,category:p.category,costPrice:p.costPrice,sellingPrice:p.sellingPrice,img:p.img,stock:p.stock});setEditId(p.id);setShowForm(true);};
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
  const remove=async id=>{if(window.confirm("Apagar produto?"))try{await delDoc("products",id);}catch(e){console.error(e);}};
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
            <div className="admin-form-field"><label>Sub-título</label><input type="text" value={form.sub} onChange={e=>setForm(f=>({...f,sub:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Categoria</label><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{categories.map(c=><option key={c.id||c.name}>{c.name}</option>)}</select></div>
            <div className="admin-form-field"><label>Custo (AKZ)</label><input type="number" value={form.costPrice} onChange={e=>setForm(f=>({...f,costPrice:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Venda (AKZ) *</label><input type="number" value={form.sellingPrice} onChange={e=>setForm(f=>({...f,sellingPrice:e.target.value}))} /></div>
            <div className="admin-form-field admin-form-full"><PhotoUpload value={form.img} onChange={v=>setForm(f=>({...f,img:v}))} label="Foto do Produto" /></div>
          </div>
          <div style={{display:"flex",gap:9,marginTop:14}}>
            <button className="btn-green" onClick={save} disabled={saving}>{saving?"A guardar...":editId?"Guardar":"Adicionar"}</button>
            <button className="btn-sm btn-gray" style={{padding:"9px 16px"}} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header"><div className="card-title">Catálogo ({products.length})</div><button className="btn-green btn-sm" onClick={openNew}>+ Novo</button></div>
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>Produto</th><th>Categoria</th><th>Custo</th><th>Venda</th><th>Margem</th><th>Stock</th><th></th></tr></thead>
            <tbody>{products.map(p=>{const margin=p.costPrice>0?(((p.sellingPrice-p.costPrice)/p.costPrice)*100).toFixed(0):null;return(
              <tr key={p.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:9}}><img src={p.img} alt="" style={{width:34,height:34,borderRadius:6,objectFit:"cover",background:"var(--gray)"}} onError={e=>{e.target.style.display="none";}} /><div><div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{p.sub}</div></div></div></td>
                <td><span className="tag">{p.category}</span></td>
                <td style={{fontSize:12,color:"var(--ink-muted)"}}>{fmt(p.costPrice)}</td>
                <td style={{fontFamily:"var(--font-display)",fontSize:14,fontWeight:600}}>{fmt(p.sellingPrice)}</td>
                <td><span style={{color:"var(--green)",fontWeight:700}}>{margin?`+${margin}%`:"—"}</span></td>
                <td><label className="toggle"><input type="checkbox" checked={p.stock} onChange={()=>toggleStock(p)} /><span className="toggle-slider" /></label></td>
                <td><div style={{display:"flex",gap:4}}><button className="btn-sm btn-gray" onClick={()=>openEdit(p)}>✏️</button><button className="btn-sm btn-red" onClick={()=>remove(p.id)}>🗑️</button></div></td>
              </tr>
            );})}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminOrders({ orders, clients, settings }) {
  const [filter,setFilter]=useState("All");
  const [subTab,setSubTab]=useState("all");
  const [invoiceOrder,setInvoiceOrder]=useState(null);
  const creditOrders=orders.filter(o=>CREDIT_METHODS.includes(o.paymentMethod));
  const shown=subTab==="credit"?creditOrders:(filter==="All"?orders:orders.filter(o=>o.status===filter));
  const isOverdue=o=>{if(!CREDIT_METHODS.includes(o.paymentMethod)||!o.creditDueDate||o.paymentStatus==="Paid")return false;try{return new Date(o.creditDueDate.split("/").reverse().join("-"))<new Date();}catch{return false;}};
  const getPhone=order=>{const c=clients.find(cl=>(cl.id||cl._id)===order.clientId||cl.code===order.clientCode);return(c?.phone||order.clientPhone||"").replace(/\D/g,"")||WA_NUMBER;};
  const updateStatus=async(id,status)=>{try{await updDoc("orders",id,{status});}catch(e){console.error(e);}};
  const markPaid=async id=>{try{await updDoc("orders",id,{paymentStatus:"Paid",status:"Delivered"});}catch(e){console.error(e);}};
  const sendConfirm=order=>{const pm=PAYMENT_METHODS.find(m=>m.id===order.paymentMethod);window.open(waLink(`✅ *Encomenda Confirmada — Menamart*\n\nOlá *${order.clientName}*!\n📦 ID: ${order.id}\n💰 Total: ${fmt(order.total)}\n${pm?`💳 ${pm.label}\n`:""}${order.creditDueDate?`📅 Prazo: ${order.creditDueDate}\n`:""}📍 ${order.address}\n\nObrigado! 🙏`,getPhone(order)),"_blank");};
  const sendReminder=order=>window.open(waLink(`📅 *Lembrete de Pagamento — Menamart*\n\nOlá *${order.clientName}*!\n\nEncomenda *${order.id}*\n💰 Valor: ${fmt(order.total)}\n📅 Data limite: ${order.creditDueDate}\n\nPor favor efectue o pagamento.\n_Menamart_`,getPhone(order)),"_blank");
  return (
    <div>
      <div className="admin-title">Gestão de Encomendas</div>
      <div className="admin-sub">Estados actualizados em tempo real via Firebase.</div>
      {creditOrders.filter(isOverdue).length>0&&<div className="credit-box" style={{marginBottom:16}}>⚠️ <strong>{creditOrders.filter(isOverdue).length} encomenda(s) a crédito em atraso!</strong></div>}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button className={`pill${subTab==="all"?" active":""}`} onClick={()=>setSubTab("all")}>Todas ({orders.length})</button>
        <button className={`pill${subTab==="credit"?" active":""}`} onClick={()=>setSubTab("credit")} style={{background:subTab==="credit"?"#7c3aed":"",borderColor:subTab==="credit"?"#7c3aed":"",color:subTab==="credit"?"#fff":""}}>📅 Crédito ({creditOrders.length})</button>
      </div>
      {subTab==="all"&&<div className="pills" style={{marginBottom:16}}>{["All",...STATUS_FLOW].map(s=><button key={s} className={`pill${filter===s?" active":""}`} onClick={()=>setFilter(s)}>{s==="All"?"Todas":s}</button>)}</div>}
      <div className="card">
        <div style={{overflowX:"auto"}}>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Estado</th><th>Data</th><th>Acções</th></tr></thead>
            <tbody>{shown.map(o=>{const c=STATUS_COLORS[o.status]||"#999";const pm=PAYMENT_METHODS.find(m=>m.id===o.paymentMethod);const isC=CREDIT_METHODS.includes(o.paymentMethod);const overdue=isOverdue(o);return(
              <tr key={o.id} style={{background:overdue?"#fff1f1":""}}>
                <td><strong style={{fontFamily:"monospace"}}>{o.id}</strong>{overdue&&<div style={{fontSize:10,color:"#dc2626",fontWeight:700}}>⚠️ ATRASO</div>}</td>
                <td><div style={{fontWeight:700,fontSize:13}}>{o.clientName}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{o.clientCode}</div></td>
                <td style={{fontFamily:"var(--font-display)",color:"var(--green)",fontSize:14,fontWeight:600}}>{fmt(o.total)}</td>
                <td><span className={`tag${isC?" tag-credit":""}`}>{pm?`${pm.icon} ${pm.label}`:"—"}</span>{isC&&<div style={{fontSize:10,color:overdue?"#dc2626":"#5b21b6",fontWeight:700,marginTop:2}}>Vence: {o.creditDueDate}</div>}{isC&&o.paymentStatus==="Paid"&&<div style={{fontSize:10,color:"#16a34a",fontWeight:700}}>✅ Pago</div>}</td>
                <td><select className="status-select" value={o.status} onChange={e=>updateStatus(o.id,e.target.value)} style={{borderColor:`${c}80`,color:c,background:`${c}12`}}>{STATUS_FLOW.map(s=><option key={s}>{s}</option>)}</select></td>
                <td style={{fontSize:12}}>{o.date}</td>
                <td><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  <button className="btn-sm" style={{background:"#25D366",color:"#fff",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:11}} onClick={()=>sendConfirm(o)}>✅</button>
                  <button className="btn-sm" style={{background:"#8B5CF6",color:"#fff",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:11}} onClick={()=>updateStatus(o.id,"Out for Delivery")}>🚚</button>
                  {isC&&!overdue&&o.paymentStatus!=="Paid"&&<button className="btn-sm" style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:11}} onClick={()=>sendReminder(o)}>📅</button>}
                  {isC&&o.paymentStatus!=="Paid"&&<button className="btn-sm" style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:11}} onClick={()=>markPaid(o.id)}>💰</button>}
                  <button className="btn-sm btn-gray" onClick={()=>setInvoiceOrder(o)}>🧾</button>
                </div></td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
      </div>
      <div className="info-box">✅ Confirmar WhatsApp · 🚚 A caminho · 📅 Lembrete crédito · 💰 Marcar pago · 🧾 Factura</div>
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
  const openNew=()=>{setForm(empty);setEditId(null);setShowForm(true);};
  const openEdit=p=>{setForm({name:p.name,type:p.type,logo:p.logo||"",desc:p.desc||""});setEditId(p.id||p._id);setShowForm(true);};
  const save=async()=>{
    if(!form.name)return;setSaving(true);
    try{
      if(editId)await setDoc(doc(db,"partners",String(editId)),{...form,id:editId});
      else{const id=genId();await setDoc(doc(db,"partners",id),{...form,id});}
    }catch(e){console.error(e);}
    setSaving(false);setShowForm(false);setEditId(null);
  };
  const remove=async id=>{if(window.confirm("Remover parceiro?"))try{await delDoc("partners",id);}catch(e){console.error(e);}};
  return (
    <div>
      <div className="admin-title">Parceiros & Fornecedores</div>
      <div className="admin-sub">Exibidos na página Sobre Nós. Guardados no Firebase.</div>
      {showForm&&(
        <div className="form-section">
          <div className="form-section-title">{editId?"✏️ Editar":"➕ Novo Parceiro"}</div>
          <div className="admin-form-grid">
            <div className="admin-form-field"><label>Nome *</label><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="admin-form-field"><label>Tipo / Sector</label><input type="text" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} /></div>
            <div className="admin-form-field admin-form-full"><label>Descrição</label><input type="text" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} /></div>
            <div className="admin-form-field admin-form-full"><PhotoUpload value={form.logo} onChange={v=>setForm(f=>({...f,logo:v}))} label="Logo / Imagem" /></div>
          </div>
          <div style={{display:"flex",gap:9,marginTop:14}}>
            <button className="btn-green" onClick={save} disabled={saving}>{saving?"A guardar...":editId?"Guardar":"Adicionar"}</button>
            <button className="btn-sm btn-gray" style={{padding:"9px 16px"}} onClick={()=>{setShowForm(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header"><div className="card-title">Parceiros ({partners.length})</div><button className="btn-green btn-sm" onClick={openNew}>+ Novo</button></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,padding:16}}>
          {partners.map(p=>(
            <div key={p.id||p._id} style={{background:"var(--off-white)",borderRadius:11,border:"1px solid var(--border)",overflow:"hidden"}}>
              <div style={{height:80,background:"var(--gray)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{p.logo?<img src={p.logo} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}} />:<div style={{fontSize:32,opacity:.2}}>🏢</div>}</div>
              <div style={{padding:"10px 12px"}}>
                <div style={{fontWeight:800,fontSize:13}}>{p.name}</div>
                <div style={{fontSize:11,color:"var(--green)",fontWeight:600}}>{p.type}</div>
                <div style={{fontSize:11,color:"var(--ink-muted)",marginTop:3,fontWeight:300}}>{p.desc}</div>
                <div style={{display:"flex",gap:6,marginTop:9}}><button className="btn-sm btn-gray" onClick={()=>openEdit(p)}>✏️</button><button className="btn-sm btn-red" onClick={()=>remove(p.id||p._id)}>🗑️</button></div>
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
      <div className="admin-sub">Feedback guardado no Firebase.</div>
      {feedbacks.length===0?(<div style={{background:"#fff",borderRadius:14,padding:"44px 24px",textAlign:"center",color:"var(--ink-muted)",border:"1px solid var(--border)"}}><div style={{fontSize:44,marginBottom:10}}>💡</div><div style={{fontWeight:700}}>Ainda sem sugestões</div></div>):feedbacks.map(f=>{const tc=typeColors[f.type]||"#6B7280";const pc={"Normal":"#6B7280","Importante":"#F59E0B","Urgente":"#DC2626"}[f.priority]||"#6B7280";const id=f.id||f._id;return(
      <div key={id} className="feedback-card" style={{opacity:f.status==="Lido"?.6:1}}>
        <span className="feedback-type-badge" style={{background:`${tc}18`,color:tc}}>{f.type}</span>
        <div className="feedback-date">{f.date} · <span style={{color:pc,fontWeight:700}}>{f.priority}</span> · <span style={{color:f.status==="Novo"?"var(--orange)":"var(--ink-muted)"}}>{f.status}</span></div>
        <div className="feedback-company">👤 {f.clientName} ({f.clientCode})</div>
        <div className="feedback-msg">{f.message}</div>
        <div style={{display:"flex",gap:7,marginTop:10}}>{f.status==="Novo"&&<button className="btn-sm btn-gray" onClick={()=>markRead(id)}>✓ Lido</button>}<button className="btn-sm btn-red" onClick={()=>remove(id)}>🗑️</button></div>
      </div>);})}
    </div>
  );
}

function AdminSecurity({ settings, setSettings, securityLog }) {
  const adminPassword=settings?.adminPassword||"menamart2026";
  const [cur,setCur]=useState("");
  const [nw,setNw]=useState("");
  const [cnf,setCnf]=useState("");
  const [msg,setMsg]=useState(null);
  const changePw=async()=>{
    if(!cur||!nw||!cnf){setMsg({e:true,t:"Preencha todos os campos."});return;}
    if(cur!==adminPassword){setMsg({e:true,t:"Senha actual incorrecta."});return;}
    if(nw.length<8){setMsg({e:true,t:"Mínimo 8 caracteres."});return;}
    if(nw!==cnf){setMsg({e:true,t:"Senhas não coincidem."});return;}
    try{await setDoc(doc(db,"settings","main"),{...settings,adminPassword:nw});}catch(e){console.error(e);}
    setCur("");setNw("");setCnf("");setMsg({e:false,t:"✅ Senha alterada e guardada no Firebase!"});
  };
  return (
    <div>
      <div className="admin-title">Segurança</div>
      <div className="admin-sub">Senha guardada no Firebase — funciona em todos os dispositivos.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:22,alignItems:"start"}}>
        <div className="form-section" style={{marginBottom:0}}>
          <div className="form-section-title">🔑 Alterar Senha</div>
          {msg&&<div style={{background:msg.e?"#FEE2E2":"var(--green-pale)",border:`1px solid ${msg.e?"#FCA5A5":"var(--green-pale2)"}`,borderRadius:8,padding:"10px 13px",fontSize:13,color:msg.e?"#DC2626":"var(--green)",marginBottom:12,fontWeight:700}}>{msg.t}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[["Senha Actual",cur,setCur],["Nova Senha (mín. 8 chars)",nw,setNw],["Confirmar Nova Senha",cnf,setCnf]].map(([label,val,setter],i)=>(
              <div key={i} className="admin-form-field"><label>{label}</label><input type="password" value={val} onChange={e=>{setter(e.target.value);setMsg(null);}} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&changePw()} /></div>
            ))}
            <button className="btn-green" style={{padding:"10px 18px"}} onClick={changePw}>Alterar Senha</button>
          </div>
          <div style={{marginTop:18,padding:"12px 14px",background:"var(--off-white)",borderRadius:9,border:"1px solid var(--border)",fontSize:12,color:"var(--ink-soft)",lineHeight:1.9,fontWeight:300}}>
            <strong style={{display:"block",marginBottom:5,fontWeight:700}}>Como aceder ao Admin</strong>
            • Atalho: <strong>Ctrl + Shift + Alt + M</strong><br />
            • Ou: clique no logo do rodapé <strong>5 vezes</strong>
          </div>
        </div>
        <div className="form-section" style={{marginBottom:0}}>
          <div className="form-section-title">🔐 Registo de Acessos</div>
          <div style={{maxHeight:360,overflowY:"auto"}}>
            {securityLog.length===0?<div style={{textAlign:"center",padding:"20px 0",color:"var(--ink-muted)",fontSize:13}}>Nenhum registo.</div>:[...securityLog].reverse().map((entry,i)=>(
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
    setSaved(true);setTimeout(()=>setSaved(false),2200);
  };
  return (
    <div>
      <div className="admin-title">Gateway de Pagamento</div>
      <div className="admin-sub">Definições guardadas no Firebase.</div>
      {saved&&<div style={{background:"var(--green-pale)",border:"1px solid var(--green-pale2)",borderRadius:9,padding:"11px 15px",marginBottom:14,fontWeight:700,color:"var(--green)"}}>✅ Guardado!</div>}
      <div className="pay-gw-card">
        <div className="pay-gw-title">🔘 Métodos Aceites</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:14}}>
          {PAYMENT_METHODS.map(m=>{const isC=CREDIT_METHODS.includes(m.id);const checked=form.acceptedMethods.includes(m.id);return(
            <label key={m.id} style={{display:"flex",alignItems:"flex-start",gap:9,padding:"11px 13px",border:`1.5px solid ${checked?(isC?"#7c3aed":"var(--green-light)"):"var(--border)"}`,borderRadius:9,background:checked?(isC?"#faf5ff":"var(--green-pale)"):"#fff",cursor:"pointer"}}>
              <input type="checkbox" checked={checked} onChange={e=>{if(e.target.checked)setForm(f=>({...f,acceptedMethods:[...f.acceptedMethods,m.id]}));else setForm(f=>({...f,acceptedMethods:f.acceptedMethods.filter(x=>x!==m.id)}));}} style={{marginTop:2}} />
              <div><div style={{fontWeight:700,fontSize:13}}>{m.icon} {m.label}</div><div style={{fontSize:11,color:"var(--ink-muted)"}}>{m.desc}</div></div>
            </label>
          );})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="admin-form-field"><label>Método por Defeito</label><select value={form.defaultMethod} onChange={e=>setForm(f=>({...f,defaultMethod:e.target.value}))}>{form.acceptedMethods.map(id=>{const m=PAYMENT_METHODS.find(x=>x.id===id);return<option key={id} value={id}>{m?.icon} {m?.label}</option>;})}</select></div>
          <div className="admin-form-field"><label>Multicaixa Ref.</label><input type="text" value={form.multicaixaRef||""} onChange={e=>setForm(f=>({...f,multicaixaRef:e.target.value}))} style={{fontFamily:"monospace"}} /></div>
        </div>
      </div>
      {(form.banks||[]).length>0&&(
        <div className="pay-gw-card">
          <div className="pay-gw-title">🏦 Contas Bancárias</div>
          {form.banks.map(b=><div key={b.id} style={{background:"var(--off-white)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 16px",marginBottom:9}}><div style={{fontWeight:800,fontSize:13}}>{b.bankName}</div><div style={{fontSize:12,color:"var(--ink-soft)",marginTop:2}}>{b.accountName}{b.iban?` · IBAN: ${b.iban}`:""}</div></div>)}
        </div>
      )}
      <button className="btn-green" style={{padding:"11px 26px",fontSize:14}} onClick={save}>💾 Guardar no Firebase</button>
    </div>
  );
}

function AdminApp({ products, categories, orders, clients, feedbacks, partners, settings, setSettings, securityLog }) {
  const [tab,setTab]=useState("dashboard");
  const newFeedbacks=feedbacks.filter(f=>f.status==="Novo").length;
  const pendingOrders=orders.filter(o=>o.status==="Pending").length;
  const creditOverdue=orders.filter(o=>{if(!CREDIT_METHODS.includes(o.paymentMethod)||!o.creditDueDate||o.paymentStatus==="Paid")return false;try{return new Date(o.creditDueDate.split("/").reverse().join("-"))<new Date();}catch{return false;}}).length;
  const navItems=[{k:"dashboard",i:"📊",l:"Dashboard"},{k:"clients",i:"👥",l:"Clientes"},{k:"products",i:"📦",l:"Produtos"},{k:"orders",i:"🛒",l:`Encomendas${pendingOrders>0?` (${pendingOrders})`:""}`},{k:"payment",i:"💳",l:"Pagamentos"},{k:"partners",i:"🤝",l:"Parceiros"},{k:"feedbacks",i:"💡",l:`Sugestões${newFeedbacks>0?` (${newFeedbacks})`:""}`},{k:"security",i:"🔒",l:"Segurança"}];
  return (
    <div className="admin-wrap">
      <div className="admin-sidebar">
        <div style={{padding:"10px 10px 4px",display:"flex",alignItems:"center",gap:7}}><Logo height={24} /><span style={{fontFamily:"var(--font-display)",fontSize:15,color:"#7dd87d",fontWeight:700}}>Admin</span></div>
        {creditOverdue>0&&<div style={{margin:"6px 8px",background:"#7c3aed",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#fff",fontWeight:700}}>⚠️ {creditOverdue} crédito(s) em atraso</div>}
        <div className="admin-sidebar-label">Menu</div>
        {navItems.map(n=><button key={n.k} className={`admin-nav-btn${tab===n.k?" active":""}`} onClick={()=>setTab(n.k)}><span>{n.i}</span>{n.l}</button>)}
      </div>
      <div className="admin-content">
        {tab==="dashboard" &&<AdminDashboard products={products} orders={orders} clients={clients} feedbacks={feedbacks} />}
        {tab==="clients"   &&<AdminClients clients={clients} orders={orders} settings={settings} setSettings={setSettings} />}
        {tab==="products"  &&<AdminProducts products={products} categories={categories} />}
        {tab==="orders"    &&<AdminOrders orders={orders} clients={clients} settings={settings} />}
        {tab==="payment"   &&<AdminPayment settings={settings} />}
        {tab==="partners"  &&<AdminPartners partners={partners} />}
        {tab==="feedbacks" &&<AdminFeedbacks feedbacks={feedbacks} />}
        {tab==="security"  &&<AdminSecurity settings={settings} setSettings={setSettings} securityLog={securityLog} />}
      </div>
    </div>
  );
}

// =============================================================================
// ROOT APP
// =============================================================================
export default function App() {
  // Firebase real-time data
  const [products,   productsLoading]   = useFirestoreCollection("products");
  const [categories, categoriesLoading] = useFirestoreCollection("categories");
  const [clients,    clientsLoading]    = useFirestoreCollection("clients");
  const [orders,     ordersLoading]     = useFirestoreCollection("orders");
  const [feedbacks,  feedbacksLoading]  = useFirestoreCollection("feedbacks");
  const [partners,   partnersLoading]   = useFirestoreCollection("partners");
  const [settingsArr,settingsLoading]   = useFirestoreCollection("settings");
  const settings = settingsArr.find(s=>s._id==="main"||s.id==="main") || DEFAULT_SETTINGS;

  const loading = productsLoading || categoriesLoading || clientsLoading || ordersLoading || feedbacksLoading || partnersLoading || settingsLoading;

  // Local UI state
  const [page,           setPage]           = useState("home");
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

  // Seed initial data once if collections are empty
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

  // Lockout timer
  useEffect(()=>{
    if(!adminLocked)return;
    let t=60;setLockTimer(t);
    const iv=setInterval(()=>{t--;setLockTimer(t);if(t<=0){clearInterval(iv);setAdminLocked(false);setFailedAttempts(0);}},1000);
    return()=>clearInterval(iv);
  },[adminLocked]);

  // Keyboard shortcut + ESC
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
        addSecLog({event:`🚨 Bloqueado após ${attempts} tentativas`,success:false});
        window.open(waLink(`🚨 *ALERTA Menamart*\n\n${attempts} tentativas de login falhadas!\n${new Date().toLocaleString("pt-AO")}`),"_blank");
        setToast({msg:`🚨 Admin bloqueado! ${attempts} tentativas falhadas.`,warn:true});
        setTimeout(()=>setToast(null),8000);
      }
    }
  };

  const handleNewOrder=async order=>{
    try{await setDoc(doc(db,"orders",order.id),order);}catch(e){console.error(e);}
    // Notify owner via WhatsApp (already done in BuyerCatalog handleCheckout)
    setToast({msg:`🛒 Nova encomenda de ${order.clientName} · ${fmt(order.total)}`});
    setTimeout(()=>setToast(null),7000);
  };

  const setSettings=async newSettings=>{
    try{await setDoc(doc(db,"settings","main"),newSettings);}catch(e){console.error(e);}
  };

  const goTo=pageKey=>{
    if(pageKey==="login"){setShowLogin(true);return;}
    setShowLogin(false);setPage(pageKey);
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const handleLogin=user=>{setCurrentUser(user);setShowLogin(false);setPage("catalog");};
  const handleLogout=()=>{setCurrentUser(null);setPage("home");};

  // Loading screen
  if(loading){
    return(
      <>
        <style>{STYLES}</style>
        <div className="loading-screen">
          <Logo height={60} style={{mixBlendMode:"luminosity",opacity:.8}} />
          <div className="loading-spinner" />
          <div className="loading-text">A carregar dados...</div>
        </div>
      </>
    );
  }

  // Admin render
  if(isAdmin){
    return(
      <>
        <style>{STYLES}</style>
        <nav className="nav" style={{background:"#060e06"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Logo height={30} /><BrandName />
            <span style={{fontFamily:"var(--font-body)",fontSize:10,fontWeight:700,background:"rgba(232,88,10,.15)",color:"#ff8040",border:"1px solid rgba(232,88,10,.25)",borderRadius:6,padding:"3px 9px",letterSpacing:".08em",textTransform:"uppercase"}}>Admin · Firebase</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {toast&&<span style={{background:"var(--orange)",color:"#fff",borderRadius:100,padding:"4px 12px",fontFamily:"var(--font-body)",fontSize:12,fontWeight:700}}>🔔 Nova encomenda</span>}
            <button onClick={()=>setIsAdmin(false)} style={{padding:"6px 13px",background:"rgba(220,38,38,.12)",color:"#f87171",border:"1px solid rgba(220,38,38,.25)",borderRadius:7,fontFamily:"var(--font-body)",fontWeight:700,fontSize:12,cursor:"pointer"}}>✕ Sair do Admin</button>
          </div>
        </nav>
        <AdminApp products={products} categories={categories} orders={orders} clients={clients} feedbacks={feedbacks} partners={partners} settings={settings} setSettings={setSettings} securityLog={securityLog} />
        {toast&&<div className={`toast${toast.warn?" toast-warn":""}`}><div>{toast.msg}</div><button className="toast-close" onClick={()=>setToast(null)}>✕</button></div>}
      </>
    );
  }

  // Public / client render
  const renderPage=()=>{
    if(currentUser){
      if(page==="account") return <ClientAccount currentUser={currentUser} setCurrentUser={setCurrentUser} orders={orders} feedbacks={feedbacks} setFeedbacks={()=>{}} goTo={goTo} onLogout={handleLogout} onSecretClick={handleFooterLogoClick} />;
      if(page==="sobre")   return (<><NavBar page={page} goTo={goTo} currentUser={currentUser} onCartOpen={()=>{}} onLogout={handleLogout} /><PageSobreNos goTo={goTo} partners={partners} /></>);
      if(page==="contacto")return (<><NavBar page={page} goTo={goTo} currentUser={currentUser} onCartOpen={()=>{}} onLogout={handleLogout} /><PageContacto goTo={goTo} /></>);
      return <BuyerCatalog products={products} categories={categories} currentUser={currentUser} settings={settings} onNewOrder={handleNewOrder} goTo={goTo} onLogout={handleLogout} onSecretClick={handleFooterLogoClick} />;
    }
    if(page==="sobre")   return (<><NavBar page={page} goTo={goTo} currentUser={null} onCartOpen={()=>{}} onLogout={()=>{}} /><PageSobreNos goTo={goTo} partners={partners} /></>);
    if(page==="contacto")return (<><NavBar page={page} goTo={goTo} currentUser={null} onCartOpen={()=>{}} onLogout={()=>{}} /><PageContacto goTo={goTo} /></>);
    return (<><NavBar page="home" goTo={goTo} currentUser={null} onCartOpen={()=>{}} onLogout={()=>{}} /><PublicLanding goTo={goTo} /></>);
  };

  return(
    <>
      <style>{STYLES}</style>
      {renderPage()}
      {showLogin&&<PageLogin clients={clients} onLogin={handleLogin} onClose={()=>setShowLogin(false)} />}
      {toast&&<div className={`toast${toast.warn?" toast-warn":""}`}><div>{toast.msg}</div><button className="toast-close" onClick={()=>setToast(null)}>✕</button></div>}
      {adminLocked&&<div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#991b1b",color:"#fff",borderRadius:14,padding:"28px 36px",textAlign:"center",zIndex:700,boxShadow:"0 20px 60px rgba(0,0,0,.4)",fontFamily:"var(--font-body)"}}><div style={{fontSize:36,marginBottom:10}}>🔒</div><div style={{fontWeight:900,fontSize:18,marginBottom:6}}>Acesso Bloqueado</div><div style={{fontSize:14,opacity:.8}}>Aguarde {lockTimer} segundos</div></div>}
      {showAdminModal&&!adminLocked&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setShowAdminModal(false);setAdminPw("");setAdminPwError(false);}}}>
          <div className="modal-box" style={{maxWidth:380}}>
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
