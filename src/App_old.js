// =============================================================================
// MENAMART v2.0 — B2B Food Supply Platform for Luanda, Angola
// Fully upgraded: security, WhatsApp notifications, payment gateway,
// feedback system, improved UI, empty client list (register manually),
// photo management, and production-ready architecture.
// =============================================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

// =============================================================================
// 1. CONSTANTS & UTILITIES
// =============================================================================

const WA_NUMBER   = "244933929233";
const MOV         = 500_000; // Minimum Order Value in AKZ
const APP_VERSION = "2.0.0";

// Formats AKZ currency
const fmt = n =>
  "AKZ " + new Intl.NumberFormat("pt-AO", { minimumFractionDigits: 0 }).format(Math.round(n));

// WhatsApp link builder
const waLink = (msg, phone = WA_NUMBER) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

// Generate unique IDs
const genId = () => Date.now() + Math.random().toString(36).slice(2, 7);

// Simple hash for password (NOT cryptographic — replace with bcrypt on backend)
const simpleHash = str => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

const STATUS_COLORS = {
  Pending:            "#F59E0B",
  Confirmed:          "#3B82F6",
  "Out for Delivery": "#8B5CF6",
  Delivered:          "#16A34A",
  Cancelled:          "#DC2626",
};
const STATUS_FLOW = ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled"];

const PAYMENT_METHODS = [
  { id: "prepaid",      label: "Pré-pago",        icon: "💳", desc: "Pagamento antes da entrega" },
  { id: "on_delivery",  label: "Contra Entrega",   icon: "🚚", desc: "Pagamento na entrega" },
  { id: "bank_transfer",label: "Transferência",    icon: "🏦", desc: "Transferência bancária" },
  { id: "multicaixa",   label: "Multicaixa",       icon: "📱", desc: "Pagamento via Multicaixa Express" },
];

const ADMIN_PW_HASH_KEY   = "mm_admin_hash";
const ADMIN_LOGIN_LOG_KEY = "mm_admin_log";
const MAX_FAILED_ATTEMPTS = 3;

// =============================================================================
// 2. LOGO (embedded base64 — unchanged)
// =============================================================================
const LOGO_SRC = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QMaRXhpZgAATU0AKgAAAAgACAESAAMAAAABAAEAAAEaAAUAAAABAAAAbgEbAAUAAAABAAAAdgEoAAMAAAABAAIAAAExAAIAAAAIAAAAfgEyAAIAAAAUAAAAhgE7AAIAAAASAAAAmodpAAQAAAABAAAArAAAAAAAAABIAAAAAQAAAEgAAAABUGljc2FydAAyMDI2OjAzOjIwIDIwOjM2Ojg1AG1lZGhhbml0ZXl6ZW11Mjg3AAAFkAMAAgAAABQAAADuoAEAAwAAAAEAAQAAoAIABAAAAAEAAALyoAMABAAAAAEAAAGrpDAAAgAAAg8AAAECAAAAADIwMjY6MDM6MjAgMjA6MzY6ODUAeyJzb3VyY2UiOiJvdGhlciIsInVpZCI6IjI3MjMzMzUwLUI5QUYtNDI3Qy04Q0RGLTgwQjRDM0EwMzE0RiIsIm9yaWdpbiI6ImdhbGxlcnkiLCJ0cmFuc3BhcmVuY3lfdmFsdWUiOnsibWF4X2FscGhhIjoxLCJtaW5fYWxwaGEiOjEsIm9wYWNpdHk5MCI6eyJwZXJjZW50YWdlIjowLCJvcGFxdWVfYm91bmRzIjp7InkiOjAsInciOjc1NCwieCI6MCwiaCI6NDI3fX0sIm9wYWNpdHkwIjp7InBlcmNlbnRhZ2UiOjAsIm9wYXF1ZV9ib3VuZHMiOnsieSI6MCwidyI6NzU0LCJ4IjowLCJoIjo0Mjd9fSwib3BhY2l0eTk5Ijp7InBlcmNlbnRhZ2UiOjAsIm9wYXF1ZV9ib3VuZHMiOnsieSI6MCwidyI6NzU0LCJ4IjowLCJoIjo0Mjd9fX0sImlzX3JlbWl4IjpmYWxzZSwidXNlZF9zb3VyY2VzIjoie1wic291cmNlc1wiOltdLFwidmVyc2lvblwiOjF9Iiwic291cmNlX3NpZCI6IjQxOUZGMEJDLUU5QzgtNEMwQy04ODg5LURGNTI3OEY1OERFQV8xNzc0MDM0MzU0MTAyIiwicHJlbWl1bV9zb3VyY2VzIjpbXSwiZnRlX3NvdXJjZXMiOltdfQAA/+0AdlBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAA9HAFaAAMbJUccAgAAAgACHAI3AAgyMDI2MDMyMBwCPAAGMjAzNjg1HAJQABFtZWRoYW5pdGV5emVtdTI4NwA4QklNBCUAAAAAABBnkN2adoGeizPYbzpF5mZy/8AAEQgBqwLyAwERAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgMDBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAX//aAAwDAQACEQMRAD8A/figAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAYetACUAFABQA1vWgBtBdgoJEPpQIDzQAuBQBGaAGFR1oASgBh60AJjNADCKAGMKAGigBrDFAAegoAbQB//9D9+KACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBhHegBvOaAFoAKAE7UAIRigtMbQDQUEBQAUAMoAYetADaACgBrDmgCNqAG0AMIoAa2SKBobyaCrCUEH/9H9+KACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAYetACUAFABQAUDTGHrQWJQSwoJEHSgBNpzQBGwINADaAAnFADW7UAR5yMUAIQaAGMOOKAG0DQjHFBY3BoMz/0v34oAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgABHTvQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFADSO9ADaACgAoAKAG7TmgpMbQDYUEiL0oAWgCNutADDQAnFADSewoAb05oAaw70ANPSgCOgBCM0FIbk0En/0/34oAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBu05oAdQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAFABQAUAIRmgBtACUAFABQAUAMwaAEoLQYxQJhQSI2MUARNQA2gBMCgBpzQAhoAjoAaRigaG0FDcj0oIP/1P34oAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgBRQAzac0AJjFACUAFABQA1qBobQWFBDYNwcigQwnNACUAMIOaAEOaAE60ANHBoARqCrDME0DsMIoCwnFBB/9X9+KACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAaRjpQA2gAoAOtADSPSgBtACdaAG44oASgAoARqAGkGgBD0oAYfegtDSKBjcCgCKgzP//W/figAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAA9KAI6AAUAFABQBHQAe1ABjNADSO9ADaACgBpzQA2gBrUANzQUhhHNBQY96AP//X/figAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAxigAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAEI70ANz7UABxQAlADTtoAbQAUAFADCKAGg5oAU9KAI8YoACOKAI8EUDQhGaC2mLsoIuf/9D9+KACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgDHv9f0bTHEWoXkVu56B2ANRKcVuzOVSMd2Zg8beFD/AMxW3/77FR7WHcn20O5IvjPwuTganAf+Bil7an3F7an3JR4t8NkcajAf+Bil7an3D20O4n/CXeG84/tCH/vsVXtqfcftYdyT/hKfDx/5iEP/AH2KXtqfcftYdw/4Snw+P+X+H/voU/bU+4vbQ7h/wlPh4n/kIQ/99il7an/MHtYdyxFr2jzOEiu42ZugDCn7WF7XGqsL2ua2QcY71sai0AFABQAUAFABQAUAFABQAUAFABQAUAFABQAdKAKd7f2ljC1xeSrDGvVmOBUykoq7JlJRV2c6PHng85/4m1vx/tisvbw7mKr0+4f8J34QPTVrf/vsUvb09rh7en3EPjvwiOurW/8A32Kftodx+2p9xP8AhPfB+f8AkL2//fYpe3p9w9vT7i/8J34Qzj+1rf8A77FCr031J+sU+5IPG/hT/oKQf99ij29PuH1il/MP/wCE18LHpqcB/wCBin7en3D6xS/mHjxj4YPTUoP++xT9rDuP29P+ZDh4u8NN93UYP++xR7WHcFiKf8xbtvEGi3cogtr2KSRuiqwJNJVqbduY6I++uaOqNfcOorcQtAwoAKACgAoAKACgAoAKACgAoAKACgAoAKAE3ClcPIrXF5bWqGSdxGo7scVnKrCCvJ2NoUpzdoq5nnxDogGftsWP94Vg8XQSvzo6lgcTe3s39xGfE+gjg38P/fYrP69h/wCdGv8AZ2K/59P7iL/hJ9C6/b4f++hR9ew3/PxD/s7Ff8+n9wDxPoJPN9F/30KX1/Df8/F95P8AZ+K/59v7g/4Snw+f+X+H/vsU/r2G/wCfiD+zsX/z7f3CHxLoOOL+H/voU/ruH/nQ/qGK/wCfb+4QeJtA718P/fYpfXsN/wA/EJ5fiv8An2/uEPinw8OuoQ/99ileYYb/AJ+If9m4v/n2/uNK0v7O/QvZzLMo6lTkV2U6sKnwO5xVaNSk7VY2LZGa2OcaRigBO4FAAw9KAI8mgBDQA0gigtsNxoIP/9H9+KACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKAMnWtWtdD0241S9cRw26FmJ9qiclGLZE5KKuz8Ef2hPjvqfjr4tXNvp1+8NpDlI1RiBgHGeK+Ex1apNtxeh8Fj5znO8HocLa3viOflb+c/wDAzXzMsTUvueL7SoupZbWvElk3zX03/fRpxxFTuR7Spfc6PSvFWtum174bP+8amVep3OiFWb6nR/2zrDqCt9L/AN9Gp9vU7m/PPub8Otav9lD/AG2XK/7RqvbVO4nUn3J113WCAftkvP8Atmj21T+Yn2k+47+29Y6/bJOP9s1LrVF9oHVn3NXTvFuv6a/22K+l3QEMuWOMij6zUT3E6s09z9N/gR8V7T4j+GovNcf2haKFlXPPHev0zLcYq1P0Pu8vxSqwse99+K9s9cKACgAoAKACgAoAKACgAoAKACgAoAKACgChqeoW2l2M1/eOI4YVLMx7AVE5qC5mTKSinJn41ftLftK634w1241Hw1dNbabhkyjY3kcdq/PcdmMqk/ceh8DjcdOpN8mx8kw6h4luI2uW1GVFXvvNeQq07bnkRnPuMt/EniAkr9vmI/3zWftp9zN1JrqXj4i14/evpf++zS+sT7mntZ/zCDxBrf/AD/S/wDfRqXXn3MnVn3Lllr+uSTBBdzOTwAGPNHtqj0TMlUm9LnoiaP47a0F/vuEgPcsw4NU1WSvcxqUK9ubmOc1LWtb0rCtqMu7uN5qKdSq+p5TqVY6cxnL431v+G+l/wC+zXUp1O5wvEVr/EP/AOE41yAbjqE3sN5/xrjxeOlShufpnCXD2MzjExjG/L1ZteGfi54v0XWbbVbPUJfMgcEAuSCB1FfA/wBqYiNb2ilof35lnB+Co4RYaUU3bVn7TfA/4sWHxP8AC0F4rgX0SgTJ3BHU1+95Lm0MbRWvvH88cS5DPK8S1y+69j3GvqT4gKACgAoAKACgAoAKACgAoAKACgAoAKACgDh/H/jKz8EeG7rXbwj9yp2AnGW7V4ea5hTwWGlWqdNj6LI8pqZljIYWmt3r6H5Q+Nfj1468WX8zfa3gtmY7UUkcdq/lbMeJ8Zi6jldpH91ZTwPlmAppcilI4aPxT4rmHzX0xU/7RrwFmFd6KbPp5ZZgIaukkyz/AG7rW3Ml5Nn/AHjVfXa/8zMPq2EvbkRVbxDrYPF5Lj/eNQ8ZX/mZ0LBYV/YX3EbeIddHP2yXn/aNJ4zEdJM2WX4TdwX3FqyuPFepN+4uZgvqWNa08TiZfaZy1o4CjvBfcdhFZavY2/2rUdTlCqOm816aq1ktajPnJ1sPUtToUl9x5zqXinVUuHW3v5dmeMsa86eLrN6TZ9RQwNBwTlTSfoVbPxFr13dRwRXcrSSMFUBj1JwKzVbEVJqEZPU6KmDwkIOdSCstdj9e/gd4SvfDHgq1XUZXkubpRK+85I3V/WnDmCnh8HH2ru2fwNxpmtPHZhJ0YpRi7Hs46V9efnYhz2oAjIzzQAtADD1oKsJQJoQ9KBDKAP/S/figAoAKACgAoAKACgAoAKACgAoAazbRuPagEgRlcblOaSY2h1MQUAFABQAUAFABQAUANzinvoPdWPz3/bX+M3/CM6KPB+mTYnuh+9cei187mOJ5UqaPAx9dJciPwL8UazcWviNdVDncHyT6g1w06ftKdjgjBTpn1J4L8Rx39lBPnIkAINfE4rDuE2fMVoOM2dzqUKXKbx+FccLpnLa7uUrC0eE5etW7msY2OlgkxgVDNkb9nKGGw9KpFl7HGKohjgtZslkqKHjaL+8DVPYg6b4K/Ei6+GvjiGdnIs5nCTLnjBOM16uX4t0aivsdmCxPsaiP2c0bU7TWdNg1OycPFcIrqQcjBGa/Vqc1OKkj9IhNTipI060NAoAKACgAoAKACgAoAKACgAoAKACgBjHaMmpfQG7H5y/tgfH5NOtn8A+G5/38oxcOp6D0r4/N8db91E+UzTF8v7qJ+Y2laLf+IdRSzsomnnmbHHJJNfEwUpPQ+RhFydkfoH8Lf2WLAadHfeMss0gB8r0+tfS4XL761D6rC4CyvI4n47+E/hn4VgGm6Dbol6nXaRXn4+NGGkTHG0qMVbqfHxtFZyEQkntXz8W3sfNcvY39D8Cav4iulghXYvc1104Sm7FU6Ups+qfBvwy8JeEIF1HXXRpVGcuR1r6CjhYU9We7SwsIK8jG+J3xr8MafpkmkaGiyyEFcjGBWlecbWRy4vFQUHFHxJf61caucpOflz2rxYxs7nw09WVxdCJdzd6xr1o0oN3PpOH8iq5tjI4WiuupVFxLPJljXwGJrubuz/AEX4b4fw+U4aFGitbHV6PbF5FJ9a8SrKyZ+k0o2fKz6m+BvxKvvhx4rtblXP2Sdgkq54296+hyXNJYLExb0Z4nEuRxzTBShb3lsfsHo+sWfiHTINT08iSGdA6kHuMiv6kwGMhiqaqwfun8Q4rDTwtaVGoviRrLxXqpJp2OONr6C0AFABQAUAFABQAUAFABQAFaAGbTmgB1ABQAUAFABQAUAFABQAhGKAG0AHSkwtYXjpQFhcCgBMZoAUDPFABkUANxQAYNAC0ABxQAUALQAUAFABQAUAFABQAhGaAEoAKACgAoAKA";

// =============================================================================
// 3. INITIAL DATA (empty client list — register manually)
// =============================================================================

const INITIAL_PRODUCTS = [
  { id:1,  name:"Arroz Carolino",      sub:"Saco 25kg",     category:"Arroz",       costPrice:8500,  sellingPrice:12500, stock:true,  img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
  { id:2,  name:"Frango Inteiro",      sub:"Por kg",        category:"Carnes",      costPrice:5500,  sellingPrice:9000,  stock:true,  img:"https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80" },
  { id:3,  name:"Tomate Fresco",       sub:"Caixa 10kg",    category:"Legumes",     costPrice:2800,  sellingPrice:4500,  stock:true,  img:"https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&q=80" },
  { id:4,  name:"Farinha Premium",     sub:"Saco 50kg",     category:"Farinhas",    costPrice:11000, sellingPrice:15000, stock:true,  img:"https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
  { id:5,  name:"Batata Branca",       sub:"Saco 25kg",     category:"Legumes",     costPrice:3500,  sellingPrice:5800,  stock:true,  img:"https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80" },
  { id:6,  name:"Salmão Atlântico",    sub:"Caixa 5kg",     category:"Peixe",       costPrice:15000, sellingPrice:22000, stock:true,  img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80" },
  { id:7,  name:"Bife Premium",        sub:"Caixa 10kg",    category:"Carnes",      costPrice:13000, sellingPrice:18500, stock:true,  img:"https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80" },
  { id:8,  name:"Azeite Extra Virgin", sub:"Lata 5L",       category:"Oleos",       costPrice:10500, sellingPrice:16000, stock:true,  img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { id:9,  name:"Sal Marinho",         sub:"Balde 10kg",    category:"Condimentos", costPrice:2800,  sellingPrice:7300,  stock:true,  img:"https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=80" },
  { id:10, name:"Café Moído",          sub:"Caixa 10x500g", category:"Bebidas",     costPrice:24000, sellingPrice:36000, stock:true,  img:"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80" },
  { id:11, name:"Feijão Frade",        sub:"Saco 25kg",     category:"Leguminosas", costPrice:12000, sellingPrice:18500, stock:true,  img:"https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80" },
  { id:12, name:"Oleo de Girassol",    sub:"Bidon 20L",     category:"Oleos",       costPrice:16000, sellingPrice:22000, stock:true,  img:"https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400&q=80" },
];

const INITIAL_CATEGORIES = [
  { name:"Arroz",       img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80" },
  { name:"Carnes",      img:"https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80" },
  { name:"Legumes",     img:"https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&q=80" },
  { name:"Peixe",       img:"https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80" },
  { name:"Farinhas",    img:"https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80" },
  { name:"Condimentos", img:"https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=80" },
  { name:"Oleos",       img:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80" },
  { name:"Leguminosas", img:"https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80" },
  { name:"Bebidas",     img:"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80" },
];

// ← STARTS EMPTY — register every client manually in the admin panel
const INITIAL_CLIENTS = [];
const INITIAL_ORDERS  = [];
const INITIAL_FEEDBACKS = [];

// Bank/Payment settings (configurable from admin) — supports multiple banks
const DEFAULT_PAYMENT_SETTINGS = {
  banks: [
    { id: "b1", bankName: "Banco BFA", accountName: "Menamart Lda", iban: "AO06.0040.0000.0000.0000.1019.6", accountNumber: "" },
  ],
  defaultMethod:   "on_delivery",
  acceptedMethods: ["prepaid","on_delivery","bank_transfer","multicaixa"],
  multicaixaRef:   "933 929 233",
  notes:           "Pagamento deve ser confirmado via WhatsApp com comprovativo.",
};

// =============================================================================
// 4. CSS — Rich visual design with animated background
// =============================================================================

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --green:       #1B6B1B;
  --green-dark:  #0f430f;
  --green-mid:   #256625;
  --green-light: #38a838;
  --green-pale:  #edf7ed;
  --green-pale2: #c2e0c2;
  --orange:      #E8580A;
  --orange-dark: #bc420a;
  --orange-light:#ff6b1a;
  --orange-pale: #fff0e8;
  --gold:        #d4a017;
  --white:       #ffffff;
  --off-white:   #f5f8f5;
  --gray:        #eff2ef;
  --border:      #d8e8d8;
  --ink:         #0c1a0c;
  --ink-soft:    #2b422b;
  --ink-muted:   #5a7a5a;
  --shadow-sm:   0 2px 8px rgba(27,107,27,.10);
  --shadow:      0 4px 24px rgba(27,107,27,.13);
  --shadow-lg:   0 12px 48px rgba(27,107,27,.20);
  --shadow-xl:   0 24px 80px rgba(27,107,27,.28);
  --radius:      16px;
  --radius-sm:   10px;
  --font-display:'DM Serif Display',serif;
  --font-body:   'DM Sans',sans-serif;
  --font-ui:     'Syne',sans-serif;
}

html{scroll-behavior:smooth}
body{
  font-family:var(--font-body);
  background:#f5f8f5;
  color:var(--ink);
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}

/* ── Background — white/light gray everywhere except nav & hero ── */
.page-bg{ display:none; }
.page-bg::after{ content:none; }

/* ── Typography ─────────────────────────────────────────────── */
.display    {font-family:var(--font-display);line-height:1.1}
.ui-label   {font-family:var(--font-ui);letter-spacing:.06em}

/* ── Navigation ─────────────────────────────────────────────── */
.nav{
  position:sticky;top:0;z-index:200;
  height:64px;
  padding:0 28px;
  display:flex;align-items:center;justify-content:space-between;
  background:#0f2310;
  border-bottom:1px solid rgba(255,255,255,.07);
  box-shadow:0 2px 12px rgba(0,0,0,.15);
}
.nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer;text-decoration:none}
.nav-logo img{height:38px;width:auto;object-fit:contain;mix-blend-mode:luminosity;opacity:.9}
.nav-brand{font-family:var(--font-display);font-size:22px;letter-spacing:-.3px}
.nav-brand-mena{color:#6ecb6e}
.nav-brand-mart{color:var(--orange-light)}
.nav-links{display:flex;gap:2px}
.nav-btn{
  padding:8px 14px;border-radius:8px;
  font-family:var(--font-ui);font-size:13px;font-weight:600;
  cursor:pointer;border:none;background:none;
  color:rgba(255,255,255,.55);transition:all .2s;
}
.nav-btn:hover,.nav-btn.active{background:rgba(110,203,110,.12);color:#6ecb6e}
.nav-right{display:flex;align-items:center;gap:10px}
.cart-btn{
  display:flex;align-items:center;gap:8px;
  padding:9px 18px;
  background:linear-gradient(135deg,var(--green-light),var(--green));
  color:#fff;border:none;border-radius:10px;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  cursor:pointer;transition:all .2s;
  box-shadow:0 2px 12px rgba(27,107,27,.4);
}
.cart-btn:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(27,107,27,.5)}
.cart-count{
  background:var(--orange);color:#fff;border-radius:50%;
  width:19px;height:19px;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:800
}
.user-pill{
  font-family:var(--font-ui);font-size:12px;font-weight:700;
  color:#6ecb6e;
  background:rgba(110,203,110,.1);
  border:1px solid rgba(110,203,110,.25);
  border-radius:8px;padding:6px 13px;cursor:pointer;
  transition:all .2s;
}
.user-pill:hover{background:rgba(110,203,110,.18)}
.btn-outline-nav{
  padding:7px 14px;
  border:1px solid rgba(255,255,255,.2);border-radius:8px;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  cursor:pointer;background:rgba(255,255,255,.04);color:rgba(255,255,255,.7);
  transition:all .2s;
}
.btn-outline-nav:hover{border-color:rgba(110,203,110,.5);color:#6ecb6e}

/* ── Page wrapper (white card on dark bg) ───────────────────── */
.page-shell{
  min-height:calc(100vh - 64px);
  background:var(--off-white);
  position:relative;
}

/* ── Hero sections ─────────────────────────────────────────── */
.hero-wrap{
  background:#0f2310;
  border-bottom:1px solid rgba(255,255,255,.06);
  padding:80px 24px 70px;
  text-align:center;position:relative;overflow:hidden;
}
.hero-wrap::before{ content:none; }
.hero-wrap::after{ content:none; }
.hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(110,203,110,.12);
  border:1px solid rgba(110,203,110,.25);
  border-radius:100px;
  padding:6px 16px;
  font-family:var(--font-ui);font-size:11px;font-weight:700;
  letter-spacing:.12em;text-transform:uppercase;
  color:#6ecb6e;margin-bottom:24px;
  position:relative;z-index:1;
}
.hero-badge::before{
  content:'';width:6px;height:6px;border-radius:50%;
  background:var(--orange-light);
  animation:pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
.hero-title{
  font-family:var(--font-display);
  font-size:clamp(30px,5.5vw,58px);
  color:#fff;font-weight:400;line-height:1.12;
  margin-bottom:16px;position:relative;z-index:1;
}
.hero-title em{font-style:italic;color:#a8e6a8}
.hero-title .accent{color:var(--orange-light)}
.hero-sub{
  font-size:16px;color:rgba(255,255,255,.58);
  max-width:520px;margin:0 auto 40px;
  line-height:1.75;position:relative;z-index:1;
  font-weight:300;
}
.hero-logo-img{
  height:72px;margin:0 auto 28px;display:block;
  mix-blend-mode:luminosity;opacity:.85;
  position:relative;z-index:1;
  filter:brightness(1.2) contrast(.9);
}
.hero-cta-row{
  display:flex;gap:14px;justify-content:center;
  flex-wrap:wrap;position:relative;z-index:1;
}

/* ── Buttons ─────────────────────────────────────────────────── */
.btn-primary{
  display:inline-flex;align-items:center;gap:10px;
  padding:14px 28px;
  background:linear-gradient(135deg,var(--orange),var(--orange-dark));
  color:#fff;border:none;border-radius:12px;
  font-family:var(--font-ui);font-weight:700;font-size:14px;
  cursor:pointer;transition:all .25s;text-decoration:none;
  box-shadow:0 4px 20px rgba(232,88,10,.35);
}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(232,88,10,.45)}
.btn-ghost{
  display:inline-flex;align-items:center;gap:10px;
  padding:14px 28px;
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.85);
  border:1px solid rgba(255,255,255,.18);border-radius:12px;
  font-family:var(--font-ui);font-weight:700;font-size:14px;
  cursor:pointer;transition:all .25s;text-decoration:none;
  backdrop-filter:blur(10px);
}
.btn-ghost:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.35)}
.btn-green{
  display:inline-flex;align-items:center;gap:8px;
  padding:10px 20px;
  background:linear-gradient(135deg,var(--green-light),var(--green));
  color:#fff;border:none;border-radius:10px;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  cursor:pointer;transition:all .2s;
  box-shadow:0 2px 12px rgba(27,107,27,.3);
}
.btn-green:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(27,107,27,.4)}
.btn-sm{
  padding:5px 11px;border-radius:7px;
  font-family:var(--font-ui);font-weight:700;font-size:12px;
  cursor:pointer;border:none;transition:all .18s;
}
.btn-gray{background:var(--gray);color:var(--ink-soft);border:1.5px solid var(--border)}
.btn-gray:hover{border-color:var(--green-light);color:var(--green)}
.btn-red{background:#FEE2E2;color:#DC2626;border:1.5px solid #FCA5A5}
.btn-red:hover{background:#DC2626;color:#fff}
.btn-wa{
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:13px;
  background:linear-gradient(135deg,#25D366,#1da855);
  color:#fff;border:none;border-radius:10px;
  font-family:var(--font-ui);font-weight:700;font-size:14px;
  cursor:pointer;text-decoration:none;transition:all .2s;
  box-shadow:0 3px 16px rgba(37,211,102,.3);
}
.btn-wa:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(37,211,102,.4)}
.btn-outline{
  padding:8px 16px;
  border:1.5px solid var(--border);border-radius:9px;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  cursor:pointer;background:var(--white);color:var(--ink-soft);transition:all .18s;
}
.btn-outline:hover{border-color:var(--green-light);color:var(--green)}

/* ── Section helpers ─────────────────────────────────────────── */
.section{padding:40px 24px;max-width:1200px;margin:0 auto;width:100%}
.section-sm{padding:24px;max-width:900px;margin:0 auto;width:100%}
.section-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:22px}
.section-title{font-family:var(--font-display);font-size:24px}
.section-link{font-family:var(--font-ui);font-size:13px;font-weight:700;color:var(--green);cursor:pointer}
.eyebrow{
  font-family:var(--font-ui);
  font-size:11px;font-weight:700;letter-spacing:.2em;
  text-transform:uppercase;color:var(--orange);
  margin-bottom:10px;text-align:center;
}

/* ── Cards ───────────────────────────────────────────────────── */
.card{
  background:var(--white);border-radius:var(--radius);
  box-shadow:var(--shadow);overflow:hidden;
  border:1px solid var(--border);margin-bottom:20px;
}
.card-header{
  padding:16px 20px;border-bottom:1px solid var(--border);
  display:flex;justify-content:space-between;align-items:center;
  background:var(--off-white);
}
.card-title{font-family:var(--font-display);font-size:18px}

/* ── Info box ────────────────────────────────────────────────── */
.info-box{
  background:var(--green-pale);
  border:1px solid var(--green-pale2);
  border-left:3px solid var(--green-light);
  border-radius:var(--radius-sm);
  padding:14px 18px;font-size:13px;
  color:var(--ink-soft);line-height:1.7;
}

/* ── Step cards (landing) ────────────────────────────────────── */
.step-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(210px,1fr));
  gap:24px;
}
.step-card{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.09);
  border-radius:18px;padding:28px;
  backdrop-filter:blur(10px);
  transition:all .3s;
  position:relative;overflow:hidden;
}
.step-card::before{
  content:'';position:absolute;
  top:-30px;right:-30px;
  width:80px;height:80px;
  border-radius:50%;
  background:radial-gradient(rgba(110,203,110,.15),transparent 70%);
}
.step-card:hover{transform:translateY(-4px);border-color:rgba(110,203,110,.25);background:rgba(255,255,255,.08)}
.step-num{
  width:40px;height:40px;border-radius:12px;
  background:linear-gradient(135deg,var(--orange),var(--orange-dark));
  display:flex;align-items:center;justify-content:center;
  font-family:var(--font-display);font-size:18px;color:#fff;
  margin-bottom:16px;box-shadow:0 4px 16px rgba(232,88,10,.3);
}
.step-icon{font-size:28px;margin-bottom:10px}
.step-title{font-family:var(--font-display);font-size:18px;color:#fff;margin-bottom:8px}
.step-desc{font-size:13px;color:rgba(255,255,255,.5);line-height:1.7;font-weight:300}

/* ── Category grid ───────────────────────────────────────────── */
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:14px}
.cat-card{
  border-radius:var(--radius);overflow:hidden;cursor:pointer;
  box-shadow:var(--shadow-sm);
  transition:all .25s;
  background:var(--white);
  border:1.5px solid var(--border);
  position:relative;
}
.cat-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:var(--green-pale2)}
.cat-card img{width:100%;height:90px;object-fit:cover;display:block;transition:transform .4s}
.cat-card:hover img{transform:scale(1.08)}
.cat-card-label{
  padding:9px 12px;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  color:var(--ink);text-align:center;
}

/* ── Product grid & card ─────────────────────────────────────── */
.prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:16px}
.prod-card{
  background:var(--white);border-radius:var(--radius);
  box-shadow:var(--shadow-sm);overflow:hidden;
  display:flex;flex-direction:column;
  transition:all .25s;border:1.5px solid var(--border);
}
.prod-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:var(--green-pale2)}
.prod-card.out-of-stock{opacity:.6}
.prod-img{position:relative;height:145px;overflow:hidden;background:var(--gray)}
.prod-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s}
.prod-card:hover .prod-img img{transform:scale(1.07)}
.oos-badge{
  position:absolute;top:10px;right:0;
  background:#DC2626;color:#fff;
  font-family:var(--font-ui);
  font-size:9px;font-weight:700;padding:3px 10px 3px 8px;
  border-radius:4px 0 0 4px;letter-spacing:.06em;text-transform:uppercase;
}
.prod-body{padding:12px 14px;flex:1}
.prod-name{font-family:var(--font-ui);font-weight:700;font-size:14px;color:var(--ink);line-height:1.3;margin-bottom:2px}
.prod-sub{font-size:11px;color:var(--ink-muted)}
.prod-price{
  font-family:var(--font-display);font-size:16px;
  color:var(--green);margin-top:7px;
}
.prod-stock-badge{margin-top:4px}
.stock-yes{font-family:var(--font-ui);font-size:10px;font-weight:700;color:var(--green-light);background:var(--green-pale);padding:2px 8px;border-radius:100px}
.stock-no {font-family:var(--font-ui);font-size:10px;font-weight:700;color:#DC2626;background:#FEE2E2;padding:2px 8px;border-radius:100px}
.add-btn{
  margin:0 14px 14px;padding:9px;
  background:linear-gradient(135deg,var(--green-light),var(--green));
  color:#fff;border:none;border-radius:9px;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  cursor:pointer;transition:all .2s;
  display:flex;align-items:center;justify-content:center;gap:6px;
  box-shadow:0 2px 10px rgba(27,107,27,.25);
}
.add-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 16px rgba(27,107,27,.35)}
.add-btn:disabled{background:var(--border);color:var(--ink-muted);cursor:not-allowed;box-shadow:none}
.qty-ctrl{display:flex;align-items:center;gap:8px;justify-content:center;padding:0 14px 14px}
.qty-btn{
  width:28px;height:28px;border-radius:7px;
  border:1.5px solid var(--border);background:var(--gray);
  cursor:pointer;font-size:15px;font-weight:900;
  display:flex;align-items:center;justify-content:center;
  color:var(--ink-soft);transition:all .15s;
}
.qty-btn:hover{border-color:var(--green);background:var(--green-pale);color:var(--green)}
.qty-num{font-family:var(--font-ui);font-weight:800;font-size:15px;min-width:24px;text-align:center}

/* ── Filter pills ────────────────────────────────────────────── */
.pills{display:flex;gap:8px;flex-wrap:wrap}
.pill{
  padding:7px 15px;border-radius:100px;
  font-family:var(--font-ui);font-weight:600;font-size:13px;
  cursor:pointer;border:1.5px solid var(--border);
  background:var(--white);color:var(--ink-soft);transition:all .18s;
  white-space:nowrap;
}
.pill:hover{border-color:var(--green-light);color:var(--green)}
.pill.active{background:var(--green);border-color:var(--green);color:#fff}

/* ── Cart drawer ─────────────────────────────────────────────── */
.cart-overlay{
  position:fixed;inset:0;background:rgba(5,10,5,.65);
  z-index:300;backdrop-filter:blur(6px);animation:fade-in .2s;
}
.cart-panel{
  position:fixed;right:0;top:0;bottom:0;width:min(420px,100vw);
  background:var(--white);z-index:301;
  display:flex;flex-direction:column;
  box-shadow:-6px 0 60px rgba(27,107,27,.25);
  animation:slide-in .3s cubic-bezier(.22,1,.36,1);
}
@keyframes fade-in{from{opacity:0}}
@keyframes slide-in{from{transform:translateX(100%)}}
@keyframes pop-in{from{transform:scale(.9);opacity:0}}
@keyframes float-up{from{transform:translateY(20px);opacity:0}}
.cart-head{
  padding:18px 20px;
  background:linear-gradient(135deg,var(--green-dark),var(--green-mid));
  display:flex;justify-content:space-between;align-items:center;
}
.cart-head-title{font-family:var(--font-display);font-size:19px;color:#fff}
.cart-close{
  width:32px;height:32px;border-radius:8px;border:none;
  background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:18px;
  display:flex;align-items:center;justify-content:center;transition:background .2s;
}
.cart-close:hover{background:rgba(255,255,255,.25)}
.cart-items{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.cart-item{
  display:flex;gap:10px;align-items:center;padding:10px;
  background:var(--off-white);border-radius:10px;border:1px solid var(--border);
}
.cart-item img{width:46px;height:46px;border-radius:8px;object-fit:cover;flex-shrink:0}
.cart-item-info{flex:1}
.cart-item-name{font-family:var(--font-ui);font-size:13px;font-weight:700;color:var(--ink);line-height:1.3}
.cart-item-price{font-size:12px;color:var(--ink-muted)}
.cart-item-total{font-family:var(--font-display);font-size:14px;color:var(--green)}
.cart-remove{background:none;border:none;cursor:pointer;color:var(--ink-muted);font-size:16px;padding:3px;transition:color .15s}
.cart-remove:hover{color:#DC2626}
.cart-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--ink-muted);gap:10px}
.cart-footer{padding:16px 20px;border-top:1.5px solid var(--border);display:flex;flex-direction:column;gap:13px}
.mov-label{display:flex;justify-content:space-between;font-family:var(--font-ui);font-size:12px;color:var(--ink-muted);margin-bottom:7px}
.mov-track{height:7px;background:var(--border);border-radius:100px;overflow:hidden}
.mov-fill{height:100%;background:linear-gradient(90deg,var(--green),var(--green-light));border-radius:100px;transition:width .5s cubic-bezier(.22,1,.36,1)}
.mov-msg{font-family:var(--font-ui);font-size:11px;color:var(--ink-muted);text-align:center;margin-top:6px}
.mov-msg.met{color:var(--green);font-weight:700}
.total-row{display:flex;justify-content:space-between;align-items:center}
.total-label{font-family:var(--font-ui);font-size:13px;color:var(--ink-soft);font-weight:600}
.total-value{font-family:var(--font-display);font-size:24px;color:var(--green)}
.delivery-note{
  background:var(--green-pale);border-left:3px solid var(--green-light);
  padding:9px 13px;border-radius:0 8px 8px 0;
  font-size:12px;color:var(--ink-soft);line-height:1.5;
}
.checkout-btn{
  padding:14px;border-radius:11px;border:none;
  font-family:var(--font-ui);font-weight:800;font-size:15px;
  cursor:pointer;transition:all .2s;width:100%;letter-spacing:.02em;
}
.checkout-btn.ready{
  background:linear-gradient(135deg,var(--green-light),var(--green));
  color:#fff;box-shadow:0 4px 20px rgba(27,107,27,.35);
}
.checkout-btn.ready:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(27,107,27,.45)}
.checkout-btn.not-ready{background:var(--border);color:var(--ink-muted);cursor:not-allowed}

/* Payment method selector */
.pay-methods{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px}
.pay-method{
  border:1.5px solid var(--border);border-radius:10px;padding:10px;
  cursor:pointer;transition:all .18s;background:var(--white);text-align:left;
}
.pay-method:hover{border-color:var(--green-light)}
.pay-method.selected{border-color:var(--green);background:var(--green-pale)}
.pay-method-icon{font-size:18px;display:block;margin-bottom:4px}
.pay-method-label{font-family:var(--font-ui);font-size:12px;font-weight:700;color:var(--ink)}
.pay-method-desc{font-size:10px;color:var(--ink-muted);line-height:1.4;margin-top:2px}

/* ── Float cart ──────────────────────────────────────────────── */
.float-cart{
  position:fixed;bottom:24px;right:24px;
  background:linear-gradient(135deg,var(--green-light),var(--green));
  color:#fff;border:none;border-radius:100px;padding:14px 22px;
  font-family:var(--font-ui);font-weight:800;font-size:14px;
  cursor:pointer;box-shadow:0 6px 30px rgba(27,107,27,.45);
  display:flex;align-items:center;gap:10px;
  z-index:150;transition:all .2s;animation:pop-in .3s,float-anim 3s 1s ease-in-out infinite alternate;
}
@keyframes float-anim{0%{box-shadow:0 6px 30px rgba(27,107,27,.45)}100%{box-shadow:0 10px 40px rgba(27,107,27,.6)}}
.float-cart:hover{transform:scale(1.04)}

/* ── Modal ───────────────────────────────────────────────────── */
.modal-overlay{
  position:fixed;inset:0;background:rgba(5,10,5,.75);
  z-index:500;display:flex;align-items:center;justify-content:center;
  padding:20px;backdrop-filter:blur(8px);animation:fade-in .2s;
}
.modal-box{
  background:var(--white);border-radius:20px;
  max-width:500px;width:100%;overflow:hidden;
  animation:pop-in .35s cubic-bezier(.22,1,.36,1);
  box-shadow:var(--shadow-xl);max-height:92vh;overflow-y:auto;
}
.modal-head{
  background:#0f2310;
  padding:30px 32px 24px;text-align:center;position:relative;overflow:hidden;
}
.modal-head::before{ content:none; }
.modal-head img{height:44px;margin-bottom:14px;mix-blend-mode:luminosity;position:relative;z-index:1}
.modal-head h2{font-family:var(--font-display);font-size:24px;color:#fff;margin-bottom:4px;position:relative;z-index:1}
.modal-head p{font-size:13px;color:rgba(255,255,255,.55);position:relative;z-index:1}
.modal-body{padding:24px 28px 28px}
.modal-error{
  background:#FEE2E2;border:1px solid #FCA5A5;border-radius:9px;
  padding:10px 14px;font-family:var(--font-ui);font-size:13px;
  color:#DC2626;margin-bottom:14px;
}

/* ── Form fields ─────────────────────────────────────────────── */
.form-field{margin-bottom:14px}
.form-label{
  display:block;font-family:var(--font-ui);
  font-size:11px;font-weight:700;color:var(--ink-soft);
  letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px;
}
.form-input{
  width:100%;padding:11px 14px;
  border:1.5px solid var(--border);border-radius:9px;
  font-family:var(--font-body);font-size:14px;color:var(--ink);
  outline:none;transition:border-color .2s;background:var(--white);
}
.form-input:focus{border-color:var(--green-light)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form-full{grid-column:1/-1}
.modal-submit{
  width:100%;padding:13px;
  background:linear-gradient(135deg,var(--green-light),var(--green));
  color:#fff;border:none;border-radius:10px;
  font-family:var(--font-ui);font-weight:800;font-size:15px;
  cursor:pointer;margin-top:8px;transition:all .2s;
}
.modal-submit:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(27,107,27,.35)}
.modal-back{
  width:100%;padding:10px;margin-top:8px;background:none;
  border:1.5px solid var(--border);border-radius:9px;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  cursor:pointer;color:var(--ink-soft);transition:border-color .15s;
}
.modal-back:hover{border-color:var(--green-light)}

/* ── Company registration placeholder boxes ──────────────────── */
.login-company-boxes{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;
}
.login-company-box{
  background:var(--green-pale);border:1.5px solid var(--green-pale2);
  border-radius:10px;padding:14px;text-align:center;
  transition:all .2s;
}
.login-company-box.featured{
  border-color:var(--green-light);
  background:linear-gradient(135deg,var(--green-pale),#d8f0d8);
}
.lcb-icon{font-size:28px;margin-bottom:6px}
.lcb-name{font-family:var(--font-ui);font-size:13px;font-weight:700;color:var(--ink);margin-bottom:2px}
.lcb-type{font-size:10px;color:var(--ink-muted);font-weight:500}
.lcb-placeholder{
  opacity:.4;border-style:dashed;
  background:transparent;
}

/* ── Success modal ───────────────────────────────────────────── */
.success-modal{
  background:var(--white);border-radius:20px;
  padding:44px 36px;max-width:440px;width:100%;
  text-align:center;animation:pop-in .35s cubic-bezier(.22,1,.36,1);
  box-shadow:var(--shadow-xl);
}
.success-icon{font-size:56px;margin-bottom:16px;animation:bounce-in .5s .2s both}
@keyframes bounce-in{from{transform:scale(0)}60%{transform:scale(1.15)}to{transform:scale(1)}}
.success-title{font-family:var(--font-display);font-size:28px;color:var(--green);margin-bottom:10px}
.success-sub{color:var(--ink-muted);font-size:14px;line-height:1.7;margin-bottom:20px;font-weight:300}
.order-id-box{
  background:var(--green-pale);border:2px solid var(--green-light);
  border-radius:12px;padding:12px 20px;
  font-family:var(--font-display);font-size:22px;color:var(--green);
  margin-bottom:20px;letter-spacing:.04em;
}

/* ── Toast notification ──────────────────────────────────────── */
.toast{
  position:fixed;top:78px;right:20px;z-index:600;
  background:linear-gradient(135deg,var(--green),var(--green-dark));
  color:#fff;border-radius:14px;
  padding:16px 22px;box-shadow:var(--shadow-xl);
  animation:pop-in .3s;max-width:330px;min-width:260px;
}
.toast-close{
  position:absolute;top:8px;right:10px;background:none;border:none;
  color:rgba(255,255,255,.6);cursor:pointer;font-size:16px;font-weight:900;
}
.toast-warn{background:linear-gradient(135deg,#DC2626,#b91c1c)}

/* ── Security badge ──────────────────────────────────────────── */
.security-attempts{
  background:linear-gradient(135deg,#7f1d1d,#991b1b);
  border:1px solid #b91c1c;border-radius:10px;
  padding:12px 16px;font-family:var(--font-ui);font-size:13px;
  color:#fca5a5;margin-bottom:14px;line-height:1.6;
}

/* ── Footer ──────────────────────────────────────────────────── */
footer{background:#0f2310;padding:56px 24px 28px;position:relative;overflow:hidden}
footer::before{
  content:'';position:absolute;
  top:-100px;left:50%;transform:translateX(-50%);
  width:600px;height:300px;border-radius:50%;
  background:radial-gradient(rgba(27,107,27,.15),transparent 70%);
  pointer-events:none;
}
.footer-inner{max-width:1100px;margin:0 auto;position:relative}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;margin-bottom:40px}
.footer-brand{display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:default}
.footer-brand img{height:32px;mix-blend-mode:luminosity;opacity:.75}
.footer-brand-name{font-family:var(--font-display);font-size:20px;color:#fff}
.footer-brand-name span{color:var(--orange-light)}
.footer-desc{font-size:13px;color:rgba(255,255,255,.38);line-height:1.8;max-width:280px;font-weight:300}
.footer-col-title{
  font-family:var(--font-ui);
  font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:rgba(255,255,255,.28);margin-bottom:16px;
}
.footer-link{display:block;font-size:13px;color:rgba(255,255,255,.48);margin-bottom:9px;cursor:pointer;transition:color .18s;text-decoration:none;font-weight:300}
.footer-link:hover{color:rgba(255,255,255,.85)}
.footer-divider{border:none;border-top:1px solid rgba(255,255,255,.07);margin-bottom:20px}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.footer-copy{font-size:11px;color:rgba(255,255,255,.25);font-weight:300}
.footer-version{font-family:var(--font-ui);font-size:10px;color:rgba(255,255,255,.18);letter-spacing:.08em}

/* ── Toggle ──────────────────────────────────────────────────── */
.toggle{position:relative;display:inline-block;width:40px;height:22px}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;inset:0;background:var(--border);border-radius:100px;cursor:pointer;transition:.3s}
.toggle-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
input:checked+.toggle-slider{background:var(--green-light)}
input:checked+.toggle-slider:before{transform:translateX(18px)}

/* ── Admin layout ────────────────────────────────────────────── */
.admin-wrap{display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 64px)}
.admin-sidebar{
  background:#0f2310;
  padding:20px 10px;display:flex;flex-direction:column;gap:3px;
  border-right:1px solid rgba(255,255,255,.06);
}
.admin-sidebar-label{
  font-family:var(--font-ui);
  font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:rgba(255,255,255,.22);padding:6px 12px;margin-top:12px;
}
.admin-nav-btn{
  display:flex;align-items:center;gap:10px;padding:10px 12px;
  border-radius:9px;cursor:pointer;color:rgba(255,255,255,.45);
  font-family:var(--font-ui);font-size:13px;font-weight:600;
  transition:all .18s;border:none;background:none;width:100%;text-align:left;
}
.admin-nav-btn:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.8)}
.admin-nav-btn.active{
  background:rgba(56,168,56,.15);color:#6ecb6e;
  border-left:2px solid var(--green-light);
}
.admin-content{padding:28px;overflow-y:auto;background:var(--off-white)}
.admin-title{font-family:var(--font-display);font-size:28px;color:var(--ink);margin-bottom:4px}
.admin-sub{color:var(--ink-muted);font-size:13px;margin-bottom:24px;font-weight:300}

/* Stats */
.stats-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:24px}
.stat-card{
  background:var(--white);border-radius:var(--radius);
  padding:20px;box-shadow:var(--shadow-sm);border:1px solid var(--border);
  position:relative;overflow:hidden;transition:all .2s;
}
.stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.stat-card::after{
  content:'';position:absolute;top:-20px;right:-20px;
  width:70px;height:70px;border-radius:50%;
  background:radial-gradient(var(--green-pale),transparent);
}
.stat-icon{font-size:22px;margin-bottom:10px}
.stat-value{font-family:var(--font-display);font-size:28px;color:var(--ink)}
.stat-label{font-family:var(--font-ui);font-size:11px;color:var(--ink-muted);margin-top:3px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.stat-note{font-size:11px;color:var(--green);font-weight:600;margin-top:5px}

/* Tables */
table{width:100%;border-collapse:collapse}
th{
  padding:10px 14px;text-align:left;
  font-family:var(--font-ui);font-size:10px;font-weight:700;
  letter-spacing:.1em;text-transform:uppercase;color:var(--ink-muted);
  background:var(--off-white);border-bottom:1.5px solid var(--border);
}
td{padding:12px 14px;font-size:13px;color:var(--ink-soft);border-bottom:1px solid #f0f4f0;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8fbf8}
.tag{display:inline-block;padding:3px 9px;border-radius:100px;font-family:var(--font-ui);font-size:11px;font-weight:700;background:var(--green-pale);color:var(--green)}
.status-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:100px;font-family:var(--font-ui);font-size:11px;font-weight:700}
.status-dot{width:6px;height:6px;border-radius:50%}
.status-select{
  padding:5px 10px;border-radius:8px;
  border:1.5px solid var(--border);
  font-family:var(--font-ui);font-size:12px;font-weight:700;
  cursor:pointer;outline:none;
}

/* Admin forms */
.form-section{background:var(--white);border-radius:var(--radius);padding:24px;border:1px solid var(--border);margin-bottom:20px}
.form-section-title{font-family:var(--font-display);font-size:19px;margin-bottom:18px;color:var(--ink);padding-bottom:12px;border-bottom:1.5px solid var(--border)}
.admin-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.admin-form-full{grid-column:1/-1}
.admin-form-field{display:flex;flex-direction:column;gap:5px}
.admin-form-field label{font-family:var(--font-ui);font-size:10px;font-weight:700;color:var(--ink-soft);letter-spacing:.08em;text-transform:uppercase}
.admin-form-field input,
.admin-form-field select,
.admin-form-field textarea{
  padding:10px 13px;border:1.5px solid var(--border);border-radius:8px;
  font-family:var(--font-body);font-size:14px;color:var(--ink);
  background:var(--white);transition:border-color .2s;outline:none;width:100%;
}
.admin-form-field input:focus,
.admin-form-field select:focus,
.admin-form-field textarea:focus{border-color:var(--green-light)}

/* Margin calculator */
.margin-calc{
  background:linear-gradient(160deg,#071507,#1a4020);
  border-radius:var(--radius);padding:24px;margin-bottom:20px;
  position:relative;overflow:hidden;
}
.margin-calc::before{
  content:'';position:absolute;bottom:-40px;right:-40px;
  width:150px;height:150px;border-radius:50%;
  background:radial-gradient(rgba(232,88,10,.15),transparent);
}
.margin-calc-title{font-family:var(--font-display);font-size:18px;color:#a8e6a8;margin-bottom:16px}
.margin-calc-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.margin-input-field label{color:rgba(255,255,255,.55);font-family:var(--font-ui);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:5px}
.margin-input-field input{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;padding:9px 13px;border-radius:8px;font-family:var(--font-body);font-size:14px;outline:none;width:100%}
.margin-input-field input:focus{border-color:#a8e6a8}
.margin-result{background:rgba(168,230,168,.1);border:1px solid rgba(168,230,168,.25);border-radius:8px;padding:12px 16px;margin-top:14px;display:flex;justify-content:space-between;align-items:center}
.margin-result-label{font-size:12px;color:rgba(255,255,255,.5)}
.margin-result-value{font-family:var(--font-display);font-size:24px;color:#a8e6a8}

/* Photo upload */
.photo-upload-area{
  border:2px dashed var(--border);border-radius:12px;
  padding:18px;background:var(--off-white);
  display:flex;flex-direction:column;align-items:center;gap:12px;
  transition:border-color .2s;
}
.photo-upload-area:hover{border-color:var(--green-pale2)}

/* Cat admin cards */
.cat-admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;padding:16px}
.cat-admin-card{background:var(--white);border-radius:var(--radius);border:1px solid var(--border);overflow:hidden;box-shadow:var(--shadow-sm)}
.cat-admin-card img{width:100%;height:80px;object-fit:cover;display:block}
.cat-admin-card-body{padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.cat-admin-card-name{font-family:var(--font-ui);font-weight:700;font-size:14px;color:var(--ink)}

/* Feedback cards */
.feedback-card{
  background:var(--white);border-radius:var(--radius);border:1px solid var(--border);
  padding:18px 20px;margin-bottom:14px;box-shadow:var(--shadow-sm);
  position:relative;
}
.feedback-type-badge{
  position:absolute;top:16px;right:16px;
  font-family:var(--font-ui);font-size:10px;font-weight:700;
  padding:3px 9px;border-radius:100px;
  text-transform:uppercase;letter-spacing:.08em;
}
.feedback-date{font-family:var(--font-ui);font-size:11px;color:var(--ink-muted);margin-bottom:6px}
.feedback-company{font-family:var(--font-ui);font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px}
.feedback-msg{font-size:13px;color:var(--ink-soft);line-height:1.7;font-weight:300}

/* Security log */
.sec-log-entry{
  display:flex;gap:12px;padding:10px 14px;
  border-radius:9px;margin-bottom:8px;
  font-size:12px;align-items:flex-start;
}
.sec-log-ok{background:#f0fdf4;border:1px solid #bbf7d0}
.sec-log-warn{background:#fff7ed;border:1px solid #fed7aa}
.sec-log-fail{background:#fef2f2;border:1px solid #fecaca}

/* Payment gateway card */
.pay-gw-card{
  background:var(--white);border-radius:var(--radius);padding:24px;
  border:1px solid var(--border);box-shadow:var(--shadow-sm);margin-bottom:16px;
}
.pay-gw-title{font-family:var(--font-display);font-size:19px;margin-bottom:16px;padding-bottom:12px;border-bottom:1.5px solid var(--border)}
.bank-detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--off-white);align-items:center}
.bank-detail-label{font-family:var(--font-ui);font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.06em}
.bank-detail-value{font-family:var(--font-ui);font-weight:700;color:var(--ink);font-size:14px}

/* Catalog search bar */
.catalog-bar{
  display:flex;background:linear-gradient(135deg,var(--green),var(--green-dark));
  padding:14px 24px;align-items:center;gap:14px;
  border-bottom:1px solid rgba(255,255,255,.08);
}
.catalog-search{
  display:flex;flex:1;max-width:500px;
  background:rgba(255,255,255,.12);border-radius:10px;overflow:hidden;
  backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.15);
}
.catalog-search input{
  flex:1;padding:11px 16px;border:none;background:none;
  font-family:var(--font-body);font-size:14px;color:#fff;outline:none;
}
.catalog-search input::placeholder{color:rgba(255,255,255,.5)}
.catalog-search button{background:rgba(255,255,255,.12);border:none;padding:0 18px;cursor:pointer;font-size:16px;color:rgba(255,255,255,.8)}
.back-btn{
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;
  font-family:var(--font-ui);font-weight:700;font-size:13px;
  transition:all .18s;
}
.back-btn:hover{background:rgba(255,255,255,.2)}

/* Team section */
.team-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:48px}
.team-card{background:var(--white);border-radius:20px;overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--border)}
.team-photo{height:260px;background:linear-gradient(135deg,var(--green-pale),var(--green-pale2));display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.team-photo img{width:100%;height:100%;object-fit:cover}
.team-photo-placeholder{font-size:80px;opacity:.25}
.team-body{padding:24px}
.team-name{font-family:var(--font-display);font-size:24px;color:var(--ink);margin-bottom:4px}
.team-role{font-family:var(--font-ui);font-size:12px;font-weight:700;color:var(--orange);letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
.team-bio{font-size:14px;color:var(--ink-soft);line-height:1.75;font-weight:300}

/* WA confirmation screen */
.wa-confirm-box{
  background:linear-gradient(135deg,#f0fdf4,#dcfce7);
  border:2px solid #86efac;border-radius:14px;padding:20px;margin-bottom:16px;
  text-align:center;
}
.wa-confirm-number{font-family:var(--font-display);font-size:22px;color:var(--green);margin:8px 0}

/* ── Responsive — comprehensive mobile-first ─────────────────── */
@media(max-width:900px){
  .team-grid{grid-template-columns:1fr}
  .admin-wrap{grid-template-columns:1fr}
  .admin-sidebar{
    flex-direction:row;flex-wrap:wrap;
    padding:8px 10px;gap:4px;
    border-right:none;
    border-bottom:1px solid rgba(255,255,255,.06);
    overflow-x:auto;
  }
  .admin-sidebar-label{display:none}
  .admin-nav-btn{
    padding:7px 10px;font-size:12px;
    border-left:none!important;
    flex-shrink:0;
  }
  .admin-content{padding:16px}
  .footer-grid{grid-template-columns:1fr;gap:28px}
  .nav-links{display:none}
  .margin-calc-grid{grid-template-columns:1fr}
  .admin-form-grid{grid-template-columns:1fr}
  .form-grid{grid-template-columns:1fr}
  .login-company-boxes{grid-template-columns:1fr}
  .pay-methods{grid-template-columns:1fr 1fr}
  .section{padding:28px 16px}
  .stats-row{grid-template-columns:1fr 1fr}
  .hero-wrap{padding:52px 16px 44px}
  .cat-grid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
  .prod-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
}

@media(max-width:640px){
  /* Nav */
  .nav{padding:0 14px;height:56px}
  .nav-brand{font-size:18px}
  .nav-logo img{height:32px}
  .btn-outline-nav{padding:6px 10px;font-size:12px}
  .cart-btn{padding:7px 13px;font-size:12px}
  .user-pill{font-size:11px;padding:5px 10px}

  /* Hero */
  .hero-wrap{padding:40px 16px 36px}
  .hero-title{font-size:clamp(24px,7vw,34px)!important}
  .hero-sub{font-size:14px;margin-bottom:28px}
  .hero-cta-row{flex-direction:column;align-items:center;gap:10px}
  .hero-cta-row .btn-primary,
  .hero-cta-row .btn-ghost{width:100%;max-width:320px;justify-content:center}
  .hero-logo-img{height:54px}
  .hero-badge{font-size:10px;padding:5px 12px}

  /* Product + category grids */
  .prod-grid{grid-template-columns:1fr 1fr;gap:10px}
  .cat-grid{grid-template-columns:repeat(3,1fr);gap:8px}
  .cat-card img{height:72px}
  .cat-card-label{font-size:11px;padding:7px 8px}
  .prod-img{height:120px}
  .prod-body{padding:9px 10px}
  .prod-name{font-size:12px}
  .prod-price{font-size:14px}
  .add-btn{margin:0 10px 10px;padding:8px;font-size:12px}
  .qty-ctrl{padding:0 10px 10px}

  /* Cart */
  .cart-panel{width:100vw}
  .cart-head{padding:14px 16px}
  .cart-items{padding:10px 12px}
  .cart-footer{padding:12px 16px}
  .float-cart{bottom:16px;right:16px;padding:11px 18px;font-size:13px}

  /* Modal */
  .modal-overlay{padding:12px}
  .modal-box{border-radius:16px;max-height:96vh}
  .modal-head{padding:22px 22px 18px}
  .modal-head h2{font-size:20px}
  .modal-head img{height:36px}
  .modal-body{padding:16px 18px 20px}

  /* Sections */
  .section{padding:24px 14px}
  .section-title{font-size:20px}
  .step-grid{grid-template-columns:1fr 1fr;gap:14px}
  .step-card{padding:20px}
  .step-title{font-size:15px}

  /* Stats */
  .stats-row{grid-template-columns:1fr 1fr;gap:10px}
  .stat-card{padding:14px}
  .stat-value{font-size:22px}

  /* Tables — horizontal scroll */
  .card>div{overflow-x:auto;-webkit-overflow-scrolling:touch}
  table{min-width:560px}
  th,td{padding:9px 10px;font-size:12px}

  /* Admin */
  .admin-title{font-size:22px}
  .form-section{padding:16px}
  .margin-calc{padding:16px}
  .cat-admin-grid{grid-template-columns:repeat(2,1fr);padding:10px;gap:10px}
  .pay-methods{grid-template-columns:1fr}
  .pay-gw-card{padding:16px}

  /* Footer */
  footer{padding:36px 16px 20px}
  .footer-grid{gap:20px}

  /* Buttons */
  .btn-primary,.btn-ghost{padding:12px 22px;font-size:13px}

  /* Success modal */
  .success-modal{padding:32px 22px}
  .order-id-box{font-size:18px}

  /* Team */
  .team-photo{height:200px}

  /* Contacto grid */
  .section > div[style*="grid-template-columns"]{display:flex!important;flex-direction:column!important}
}

@media(max-width:400px){
  .prod-grid{grid-template-columns:1fr 1fr;gap:8px}
  .cat-grid{grid-template-columns:repeat(3,1fr);gap:6px}
  .step-grid{grid-template-columns:1fr}
  .nav{padding:0 12px}
  .hero-title{font-size:22px!important}
}
`;

// =============================================================================
// 5. SHARED SMALL COMPONENTS
// =============================================================================

function Logo({ height = 40, style = {} }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    // Text fallback if image fails to load
    return (
      <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: height * 0.55, letterSpacing: "-.5px", lineHeight: 1, ...style }}>
        <span style={{ color: "#6ecb6e" }}>Mena</span><span style={{ color: "var(--orange-light, #ff6b1a)" }}>mart</span>
      </span>
    );
  }
  return (
    <img
      src={LOGO_SRC}
      alt="Menamart"
      onError={() => setBroken(true)}
      style={{ height, width: "auto", objectFit: "contain", mixBlendMode: "luminosity", opacity: .9, ...style }}
    />
  );
}

function BrandName() {
  return (
    <span className="nav-brand">
      <span className="nav-brand-mena">Mena</span>
      <span className="nav-brand-mart">mart</span>
    </span>
  );
}

// ── Photo Upload (PC file or URL) ─────────────────────────────────────────────
function PhotoUpload({ value, onChange, label = "Imagem" }) {
  const ref = useRef();
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="photo-upload-area" style={{ marginTop: 6 }}>
        {value ? (
          <div style={{ position: "relative", width: "100%" }}>
            <img src={value} alt="preview" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, display: "block" }} onError={e => { e.target.style.display = "none"; }} />
            <button onClick={() => onChange("")} style={{ position: "absolute", top: 6, right: 6, background: "#DC2626", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ) : (
          <div style={{ fontSize: 40, opacity: .2 }}>🖼️</div>
        )}
        <button type="button" onClick={() => ref.current.click()} className="btn-green" style={{ width: "auto" }}>
          📁 Carregar do PC / Telemóvel
        </button>
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>Ou cole um URL de imagem abaixo</span>
        <input type="text" value={value && value.startsWith("data:") ? "" : (value || "")} onChange={e => onChange(e.target.value)} placeholder="https://..." style={{ width: "100%", padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, outline: "none" }} />
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, cartItem, onAdd, onChangeQty }) {
  const inCart = cartItem && cartItem.qty > 0;
  return (
    <div className={`prod-card${product.stock ? "" : " out-of-stock"}`}>
      <div className="prod-img">
        <img src={product.img} alt={product.name} onError={e => { e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80"; }} />
        {!product.stock && <div className="oos-badge">Esgotado</div>}
      </div>
      <div className="prod-body">
        <div className="prod-name">{product.name}</div>
        <div className="prod-sub">{product.sub}</div>
        <div className="prod-price">{fmt(product.sellingPrice)}</div>
        <div className="prod-stock-badge">
          {product.stock ? <span className="stock-yes">✓ Em Stock</span> : <span className="stock-no">✗ Esgotado</span>}
        </div>
      </div>
      {inCart ? (
        <div className="qty-ctrl">
          <button className="qty-btn" onClick={() => onChangeQty(product.id, -1)}>−</button>
          <span className="qty-num">{cartItem.qty}</span>
          <button className="qty-btn" onClick={() => onChangeQty(product.id, 1)}>+</button>
        </div>
      ) : (
        <button className="add-btn" onClick={() => onAdd(product)} disabled={!product.stock}>
          {product.stock ? "🛒 Encomendar" : "Indisponível"}
        </button>
      )}
    </div>
  );
}

// ── Nav Bar ───────────────────────────────────────────────────────────────────
function NavBar({ page, goTo, currentUser, cartCount = 0, onCartOpen, onLogout, dark = false }) {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={() => goTo("home")}>
        <Logo height={38} />
        <BrandName />
      </div>
      <div className="nav-links">
        <button className={`nav-btn${page === "sobre" ? " active" : ""}`} onClick={() => goTo("sobre")}>Sobre Nós</button>
        {currentUser && <button className={`nav-btn${page === "catalog" ? " active" : ""}`} onClick={() => goTo("catalog")}>Catálogo</button>}
        <button className={`nav-btn${page === "contacto" ? " active" : ""}`} onClick={() => goTo("contacto")}>Contacto</button>
      </div>
      <div className="nav-right">
        {currentUser ? (
          <>
            <span className="user-pill" onClick={() => goTo("account")}>👤 {currentUser.businessName}</span>
            <button className="cart-btn" onClick={onCartOpen}>🛒 Cesto {cartCount > 0 && <span className="cart-count">{cartCount}</span>}</button>
            <button className="btn-outline-nav" onClick={onLogout}>Sair</button>
          </>
        ) : (
          <button className="btn-outline-nav" onClick={() => goTo("login")}>Entrar →</button>
        )}
      </div>
    </nav>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ goTo, onSecretClick }) {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand" onClick={onSecretClick}>
              <img src={LOGO_SRC} alt="Menamart" style={{ height: 32 }} />
              <span className="footer-brand-name">Mena<span>mart</span></span>
            </div>
            <p className="footer-desc">Plataforma B2B de abastecimento alimentar para o sector HORECA em Luanda, Angola. Acesso exclusivo para empresas verificadas.</p>
          </div>
          <div>
            <div className="footer-col-title">Empresa</div>
            <span className="footer-link" onClick={() => goTo("sobre")}>Sobre Nós</span>
            <span className="footer-link" onClick={() => goTo("contacto")}>Contacto</span>
            <a href={waLink("Olá Menamart! Gostaria de registar a minha empresa na plataforma B2B.")} target="_blank" rel="noreferrer" className="footer-link">💬 Registar Empresa</a>
          </div>
          <div>
            <div className="footer-col-title">Contacto</div>
            <span className="footer-link">📧 Menazhcomerio@gmail.com</span>
            <span className="footer-link">💬 +244 933 929 233</span>
            <span className="footer-link">📍 Rua de Benguela, São Paulo, Luanda</span>
            <span className="footer-link">🕐 07:00–18:00 (Seg–Sex)</span>
          </div>
        </div>
        <hr className="footer-divider" />
        <div className="footer-bottom">
          <span className="footer-copy">© 2025 Menamart. Todos os direitos reservados.</span>
          <span className="footer-version">v{APP_VERSION} · Plataforma B2B</span>
        </div>
      </div>
    </footer>
  );
}

// =============================================================================
// 6. PUBLIC PAGES
// =============================================================================

// ── Landing Page ──────────────────────────────────────────────────────────────
function PublicLanding({ goTo }) {
  return (
    <div>
      {/* Hero */}
      <div className="hero-wrap">
        <Logo height={72} style={{ display: "block", margin: "0 auto 28px" }} />
        <div className="hero-badge">🌱 Plataforma B2B · Luanda, Angola</div>
        <h1 className="hero-title">
          O abastecimento<br /><em>alimentar</em> que o<br />seu negócio merece
        </h1>
        <p className="hero-sub">
          Fornecemos hotéis, restaurantes e catering com produtos de qualidade.
          Acesso exclusivo para empresas verificadas em Luanda.
        </p>
        <div className="hero-cta-row">
          <a href={waLink("Olá Menamart! Gostaria de registar a minha empresa na plataforma B2B para ter acesso ao catálogo. Por favor indiquem os próximos passos.")} target="_blank" rel="noreferrer" className="btn-primary">
            💬 Registar via WhatsApp
          </a>
          <button className="btn-ghost" onClick={() => goTo("login")}>Já tenho conta →</button>
        </div>
      </div>

      {/* White content area */}
      <div style={{ background: "var(--off-white)" }}>
        {/* How it works */}
        <div style={{ background: "#0f2310", padding: "72px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="eyebrow" style={{ color: "rgba(110,203,110,.7)" }}>Como Funciona</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,4vw,40px)", color: "#fff", textAlign: "center", marginBottom: 12 }}>
              Simples, rápido e seguro
            </h2>
            <p style={{ color: "rgba(255,255,255,.45)", fontSize: 15, textAlign: "center", maxWidth: 500, margin: "0 auto 48px", lineHeight: 1.75, fontWeight: 300 }}>
              O acesso à Menamart é exclusivo para empresas verificadas. Veja como funciona.
            </p>
            <div className="step-grid">
              {[
                { n: 1, icon: "💬", title: "Contacte via WhatsApp", desc: "Envie os dados da sua empresa — NIF, contacto, tipo de negócio e morada." },
                { n: 2, icon: "✅", title: "Verificação em 24h", desc: "A nossa equipa verifica e aprova o registo da sua empresa." },
                { n: 3, icon: "🔑", title: "Recebe o código", desc: "Enviamos o seu código de acesso único (ex: MN-004) via WhatsApp." },
                { n: 4, icon: "🛒", title: "Encomende", desc: "Entre na plataforma com o código e comece a encomendar." },
              ].map((s, i) => (
                <div key={i} className="step-card">
                  <div className="step-num">{s.n}</div>
                  <div className="step-icon">{s.icon}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category preview */}
        <div style={{ padding: "64px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="eyebrow">O Nosso Catálogo</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,4vw,38px)", textAlign: "center", marginBottom: 12 }}>
              Produtos para o sector HORECA
            </h2>
            <p style={{ color: "var(--ink-muted)", fontSize: 15, textAlign: "center", maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.75, fontWeight: 300 }}>
              Arroz, carnes, peixe, óleos, conservas, bebidas e muito mais — para empresas verificadas.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 14, marginBottom: 36 }}>
              {[
                { e: "🌾", l: "Arroz & Farinhas" }, { e: "🥩", l: "Carnes" }, { e: "🐟", l: "Peixe" },
                { e: "🥕", l: "Legumes" },           { e: "🫙", l: "Conservas" }, { e: "🫒", l: "Óleos" },
                { e: "🧂", l: "Condimentos" },        { e: "☕", l: "Bebidas" }, { e: "🫘", l: "Leguminosas" },
              ].map((c, i) => (
                <div key={i} style={{ background: "var(--white)", borderRadius: 14, padding: "20px 10px", textAlign: "center", border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)", transition: "all .2s" }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>{c.e}</div>
                  <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>{c.l}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-muted)", fontFamily: "var(--font-ui)" }}>Restrito</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <a href={waLink("Olá Menamart! Gostaria de me registar para aceder ao catálogo B2B.")} target="_blank" rel="noreferrer" className="btn-primary">
                💬 Registar para ver o catálogo completo
              </a>
            </div>
          </div>
        </div>

        {/* Why Menamart */}
        <div style={{ background: "var(--white)", padding: "56px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="eyebrow">Porquê a Menamart?</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,4vw,38px)", textAlign: "center", marginBottom: 48 }}>
              Confiança, Qualidade, Pontualidade
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 24 }}>
              {[
                { icon: "⚡", t: "Entregas Rápidas", d: "07:00–18:00, Segunda a Sexta. Pontualidade garantida." },
                { icon: "✅", t: "Qualidade Verificada", d: "Todos os produtos são inspeccionados antes da entrega." },
                { icon: "🤝", t: "Só Empresas", d: "Acesso restrito a empresas verificadas — sem público geral." },
                { icon: "💰", t: "Preços Transparentes", d: "Preços justos e competitivos, sem surpresas na factura." },
                { icon: "🔒", t: "Plataforma Segura", d: "Os seus dados e encomendas são protegidos e confidenciais." },
                { icon: "📱", t: "Suporte WhatsApp", d: "Equipa disponível para responder em menos de 1 hora." },
              ].map((v, i) => (
                <div key={i} style={{ background: "var(--off-white)", borderRadius: var_radius_val(14), padding: 24, border: "1.5px solid var(--border)" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{v.icon}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink)", marginBottom: 8 }}>{v.t}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.7, fontWeight: 300 }}>{v.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer goTo={goTo} />
    </div>
  );
}

// helper to avoid CSS var in inline style string
function var_radius_val(fallback) { return fallback + "px"; }

// ── Sobre Nos ─────────────────────────────────────────────────────────────────
function PageSobreNos({ goTo }) {
  const founders = [
    { name: "Fundador 1", role: "Co-Fundador & CEO", bio: "Responsável pela estratégia comercial e relações com clientes HORECA. Lidera a expansão da Menamart em Luanda.", photo: null },
    { name: "Fundador 2", role: "Co-Fundador & COO", bio: "Gere as operações logísticas e a rede de fornecedores. Garante que cada entrega chega a tempo e em perfeitas condições.", photo: null },
  ];
  return (
    <div style={{ background: "var(--off-white)" }}>
      <div className="hero-wrap">
        <div className="hero-badge">🏢 Sobre Nós</div>
        <h1 className="hero-title">A equipa por trás da <em>Menamart</em></h1>
        <p className="hero-sub">Dois empreendedores luandenses com uma missão clara: simplificar o abastecimento alimentar para o sector HORECA em Angola.</p>
      </div>
      <div style={{ padding: "56px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div className="eyebrow">A Nossa Equipa</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px,4vw,36px)", textAlign: "center", marginBottom: 40 }}>Conheça os fundadores</h2>
          <div className="team-grid">
            {founders.map((f, i) => (
              <div key={i} className="team-card">
                <div className="team-photo">{f.photo ? <img src={f.photo} alt={f.name} /> : <div className="team-photo-placeholder">👨‍💼</div>}</div>
                <div className="team-body">
                  <div className="team-name">{f.name}</div>
                  <div className="team-role">{f.role}</div>
                  <div className="team-bio">{f.bio}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20, marginBottom: 48 }}>
            {[
              { icon: "🎯", t: "Missão", d: "Simplificar o abastecimento alimentar B2B em Luanda, conectando HORECA com produtos de qualidade a preços competitivos." },
              { icon: "🌍", t: "Visão", d: "Ser a principal plataforma de distribuição alimentar do sector HORECA em Angola, expandindo para todo o país." },
              { icon: "🏆", t: "Objectivo", d: "Eficiência, transparência e confiança a cada encomenda — no prazo certo, sem surpresas." },
            ].map((v, i) => (
              <div key={i} style={{ background: "var(--white)", borderRadius: 16, padding: 28, border: "1.5px solid var(--border)", boxShadow: "var(--shadow-sm)", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{v.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)", marginBottom: 10 }}>{v.t}</div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.75, fontWeight: 300 }}>{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer goTo={goTo} />
    </div>
  );
}

// ── Contacto ──────────────────────────────────────────────────────────────────
function PageContacto({ goTo }) {
  const [form, setForm] = useState({ name: "", company: "", subject: "Encomenda", message: "" });
  const [sent, setSent] = useState(false);
  const submit = () => { if (!form.name || !form.message) return; setSent(true); };
  return (
    <div style={{ background: "var(--off-white)" }}>
      <div className="hero-wrap" style={{ padding: "60px 24px 50px" }}>
        <div className="hero-badge">📞 Contacto</div>
        <h1 className="hero-title" style={{ fontSize: "clamp(26px,4vw,42px)" }}>Fale connosco</h1>
        <p className="hero-sub">Estamos aqui para ajudar o seu negócio</p>
      </div>
      <div className="section" style={{ maxWidth: 900 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "💬", t: "WhatsApp", v: "+244 933 929 233", s: "Resposta em menos de 1 hora" },
              { icon: "📧", t: "Email", v: "Menazhcomerio@gmail.com", s: "Resposta em até 4 horas" },
              { icon: "📍", t: "Localização", v: "Rua de Benguela, São Paulo, Luanda", s: "" },
              { icon: "🕐", t: "Horário", v: "07:00 – 18:00", s: "Segunda a Sexta-feira" },
            ].map((c, i) => (
              <div key={i} style={{ background: "var(--white)", borderRadius: 12, padding: 18, boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", display: "flex", gap: 14 }}>
                <div style={{ width: 44, height: 44, background: "var(--green-pale)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 2 }}>{c.t}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--green)" }}>{c.v}</div>
                  {c.s && <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2, fontWeight: 300 }}>{c.s}</div>}
                </div>
              </div>
            ))}
            <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noreferrer" className="btn-wa">💬 Falar no WhatsApp</a>
          </div>
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 28, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--green)", marginBottom: 10 }}>Mensagem Enviada!</div>
                <p style={{ color: "var(--ink-muted)", fontSize: 14, marginBottom: 20, fontWeight: 300 }}>A nossa equipa responderá em breve.</p>
                <button className="btn-green" onClick={() => setSent(false)}>Nova Mensagem</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink)", marginBottom: 20, paddingBottom: 14, borderBottom: "1.5px solid var(--border)" }}>Enviar Mensagem</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="admin-form-field"><label>Nome *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="O seu nome" /></div>
                    <div className="admin-form-field"><label>Empresa</label><input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Hotel/Restaurante" /></div>
                  </div>
                  <div className="admin-form-field"><label>Assunto</label><select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>{["Encomenda", "Parceria", "Reclamação", "Informação Geral", "Outro"].map(t => <option key={t}>{t}</option>)}</select></div>
                  <div className="admin-form-field"><label>Mensagem *</label><textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Como podemos ajudar?" rows={4} style={{ resize: "vertical" }} /></div>
                  <button onClick={submit} className="btn-green" style={{ width: "100%", padding: 13, fontSize: 15 }}>Enviar Mensagem →</button>
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

// ── Login Page — Company Name + Access Code ───────────────────────────────────
function PageLogin({ goTo, clients, onLogin }) {
  const [companyName, setCompanyName] = useState("");
  const [code,        setCode]        = useState("");
  const [addr,        setAddr]        = useState("");
  const [error,       setError]       = useState("");
  const [step,        setStep]        = useState(1); // 1=login, 2=confirm address
  const [found,       setFound]       = useState(null);

  const check = () => {
    const name = companyName.trim().toLowerCase();
    const cd   = code.trim().toUpperCase();
    if (!name) { setError("Introduza o nome da sua empresa."); return; }
    if (!cd)   { setError("Introduza o seu código de acesso."); return; }
    const match = clients.find(c =>
      c.approved &&
      c.code.toUpperCase() === cd &&
      c.businessName.trim().toLowerCase() === name
    );
    if (match) {
      setFound(match);
      setAddr(match.address || "");
      setError("");
      setStep(2);
    } else {
      // Provide specific feedback
      const codeExists = clients.find(c => c.approved && c.code.toUpperCase() === cd);
      const nameExists = clients.find(c => c.approved && c.businessName.trim().toLowerCase() === name);
      if (!codeExists && !nameExists) setError("Empresa ou código não encontrado. Verifique os dados ou registe-se via WhatsApp.");
      else if (codeExists && !nameExists) setError("Nome da empresa não corresponde ao código. Verifique o nome exacto.");
      else if (!codeExists && nameExists) setError("Código incorrecto para esta empresa. Verifique o seu código.");
      else setError("Dados incorrectos. Confirme via WhatsApp se precisar de ajuda.");
    }
  };

  const confirm = () => {
    if (!addr.trim()) { setError("Indique o endereço de entrega."); return; }
    onLogin({ ...found, address: addr.trim() });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 440, width: "calc(100vw - 32px)" }}>
        <div className="modal-head">
          <img src={LOGO_SRC} alt="Menamart" />
          <h2>{step === 1 ? "Entrar na Plataforma" : "Bem-vindo!"}</h2>
          <p>{step === 1 ? "Acesso exclusivo para empresas verificadas" : `${found?.businessName} — confirme o endereço`}</p>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">⚠️ {error}</div>}

          {step === 1 && (
            <>
              <div className="form-field">
                <label className="form-label">Nome da Empresa</label>
                <input
                  className="form-input"
                  type="text"
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setError(""); }}
                  placeholder="Ex: Hotel Intercontinental"
                  autoFocus
                  autoCapitalize="words"
                  onKeyDown={e => e.key === "Enter" && check()}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Código de Acesso</label>
                <input
                  className="form-input"
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="Ex: MN-001"
                  autoCapitalize="characters"
                  style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 900, textAlign: "center", letterSpacing: ".14em" }}
                  onKeyDown={e => e.key === "Enter" && check()}
                />
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 5, fontFamily: "var(--font-ui)" }}>
                  O código é enviado por WhatsApp quando a sua empresa é aprovada
                </div>
              </div>
              <button className="modal-submit" onClick={check}>Verificar Acesso →</button>
              <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--ink-muted)" }}>
                Não tem acesso?{" "}
                <a href={waLink("Olá Menamart! Gostaria de registar a minha empresa na plataforma B2B.")} target="_blank" rel="noreferrer" style={{ color: "var(--green)", fontWeight: 700, textDecoration: "none" }}>
                  Registar via WhatsApp
                </a>
              </div>
              <a
                href={waLink("Olá Menamart! Não consigo entrar na plataforma. Empresa: [NOME]. Por favor ajudem!")}
                target="_blank" rel="noreferrer"
                className="btn-wa"
                style={{ marginTop: 12 }}
              >
                💬 Preciso de ajuda para entrar
              </a>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ background: "var(--green-pale)", border: "1.5px solid var(--green-pale2)", borderRadius: 10, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 30, flexShrink: 0 }}>
                  {found?.type === "Hotel" ? "🏨" : found?.type === "Restaurante" ? "🍽️" : found?.type === "Catering" ? "🍱" : "🏢"}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, color: "var(--green)", fontSize: 15 }}>{found?.businessName}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                    {found?.type} · Código: <strong style={{ fontFamily: "monospace" }}>{found?.code}</strong>
                  </div>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Confirmar Endereço de Entrega</label>
                <input
                  className="form-input"
                  type="text"
                  value={addr}
                  onChange={e => { setAddr(e.target.value); setError(""); }}
                  placeholder="Bairro, Município, Luanda"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && confirm()}
                />
              </div>
              <button className="modal-submit" onClick={confirm}>Confirmar & Entrar →</button>
              <button className="modal-back" onClick={() => { setStep(1); setError(""); }}>← Voltar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 7. CLIENT PAGES (authenticated)
// =============================================================================

// ── Buyer Catalog ─────────────────────────────────────────────────────────────
function BuyerCatalog({ products, categories, currentUser, paymentSettings, onNewOrder, goTo }) {
  const [cart,      setCart]      = useState([]);
  const [cartOpen,  setCartOpen]  = useState(false);
  const [activeCat, setActiveCat] = useState("Todos");
  const [search,    setSearch]    = useState("");
  const [view,      setView]      = useState("home");
  const [success,   setSuccess]   = useState(null);
  const [payMethod, setPayMethod] = useState(paymentSettings?.defaultMethod || "on_delivery");
  const [checkoutStep, setCheckoutStep] = useState("cart"); // "cart" | "payment" | "confirm"

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      const catOk = activeCat === "Todos" || p.category === activeCat;
      if (!q) return catOk;
      return catOk && (p.name.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    });
  }, [products, activeCat, search]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.sellingPrice * i.qty, 0);
  const movPct    = Math.min((cartTotal / MOV) * 100, 100);
  const movMet    = cartTotal >= MOV;

  const addItem = p => setCart(prev => {
    const ex = prev.find(i => i.id === p.id);
    return ex ? prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { ...p, qty: 1 }];
  });
  const changeQty = (id, delta) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  const removeItem = id => setCart(prev => prev.filter(i => i.id !== id));

  const handleCheckout = () => {
    const orderId = "ORD-" + String(Math.floor(Math.random() * 90000) + 10000);
    const order = {
      id: orderId,
      clientId: currentUser.id,
      clientName: currentUser.businessName,
      clientPhone: (currentUser.phone || "").replace(/\D/g, ""),
      clientCode: currentUser.code,
      total: cartTotal,
      address: currentUser.address,
      date: new Date().toISOString().split("T")[0],
      status: "Pending",
      paymentMethod: payMethod,
      paymentStatus: payMethod === "prepaid" ? "Pending Payment" : "Pay on Delivery",
      items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.sellingPrice })),
    };
    onNewOrder(order);
    setSuccess({ id: orderId, total: cartTotal, payMethod });
    setCart([]);
    setCartOpen(false);
    setCheckoutStep("cart");
  };

  const catNames = ["Todos", ...categories.map(c => c.name)];
  const acceptedMethods = (paymentSettings?.acceptedMethods || ["on_delivery"]);
  const selectedPayInfo = PAYMENT_METHODS.find(m => m.id === payMethod);

  return (
    <>
      {/* Home view */}
      {view === "home" ? (
        <div style={{ background: "var(--off-white)" }}>
          <div style={{ background: "linear-gradient(160deg,var(--green-dark),var(--green))", padding: "48px 24px 40px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontFamily: "var(--font-ui)", fontWeight: 600, color: "rgba(255,255,255,.7)", marginBottom: 8 }}>Bem-vindo, <strong>{currentUser.businessName}</strong></div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px,4vw,36px)", color: "#fff", marginBottom: 16 }}>O que procura hoje?</h1>
            <div style={{ display: "flex", maxWidth: 500, margin: "0 auto", background: "rgba(255,255,255,.15)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.2)", backdropFilter: "blur(10px)" }}>
              <input style={{ flex: 1, padding: "13px 18px", border: "none", background: "none", fontFamily: "inherit", fontSize: 15, color: "#fff", outline: "none" }} placeholder="Pesquisar produtos..." value={search} onChange={e => { setSearch(e.target.value); setView("catalog"); }} />
              <button style={{ background: "rgba(255,255,255,.15)", border: "none", padding: "0 22px", cursor: "pointer", fontSize: 18, color: "rgba(255,255,255,.8)" }}>🔍</button>
            </div>
          </div>
          <div className="section">
            <div className="section-header"><div className="section-title">Categorias</div><span className="section-link" onClick={() => setView("catalog")}>Ver tudo →</span></div>
            <div className="cat-grid">
              {categories.map(c => (
                <div key={c.name} className="cat-card" onClick={() => { setActiveCat(c.name); setView("catalog"); }}>
                  <img src={c.img} alt={c.name} onError={e => { e.target.style.display = "none"; }} />
                  <div className="cat-card-label">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="section" style={{ paddingTop: 0 }}>
            <div className="section-header"><div className="section-title">Destaques</div><span className="section-link" onClick={() => setView("catalog")}>Ver todos →</span></div>
            <div className="prod-grid">
              {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} cartItem={cart.find(i => i.id === p.id)} onAdd={addItem} onChangeQty={changeQty} />)}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--off-white)" }}>
          <div className="catalog-bar">
            <button className="back-btn" onClick={() => { setSearch(""); setActiveCat("Todos"); setView("home"); }}>← Início</button>
            <div className="catalog-search">
              <input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
              <button>🔍</button>
            </div>
          </div>
          <div className="section">
            <div className="pills" style={{ marginBottom: 22 }}>
              {catNames.map(c => <button key={c} className={`pill${activeCat === c ? " active" : ""}`} onClick={() => setActiveCat(c)}>{c}</button>)}
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, marginBottom: 8 }}>Nenhum produto encontrado</div>
                {search && <span style={{ color: "var(--green)", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 700 }} onClick={() => { setSearch(""); setActiveCat("Todos"); }}>Limpar pesquisa</span>}
              </div>
            ) : (
              <div className="prod-grid">{filtered.map(p => <ProductCard key={p.id} product={p} cartItem={cart.find(i => i.id === p.id)} onAdd={addItem} onChangeQty={changeQty} />)}</div>
            )}
          </div>
        </div>
      )}

      {/* Float cart */}
      {cartCount > 0 && !cartOpen && (
        <button className="float-cart" onClick={() => setCartOpen(true)}>
          🛒 {cartCount} {cartCount === 1 ? "item" : "itens"} · {fmt(cartTotal)}
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div className="cart-overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-panel">
            <div className="cart-head">
              <span className="cart-head-title">🛒 O Meu Cesto</span>
              <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
            </div>
            {cart.length === 0 ? (
              <div className="cart-empty"><div style={{ fontSize: 48, opacity: .2 }}>🛒</div><div style={{ fontFamily: "var(--font-ui)", fontWeight: 700 }}>Cesto vazio</div></div>
            ) : (
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={item.img} alt={item.name} onError={e => { e.target.style.display = "none"; }} />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">{fmt(item.sellingPrice)} × {item.qty}</div>
                    </div>
                    <div className="cart-item-total">{fmt(item.sellingPrice * item.qty)}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <button className="qty-btn" style={{ width: 22, height: 22, fontSize: 12 }} onClick={() => changeQty(item.id, 1)}>+</button>
                      <button className="qty-btn" style={{ width: 22, height: 22, fontSize: 12 }} onClick={() => changeQty(item.id, -1)}>−</button>
                    </div>
                    <button className="cart-remove" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="cart-footer">
              <div>
                <div className="mov-label"><span>Encomenda mínima</span><strong style={{ color: "var(--ink)" }}>{fmt(MOV)}</strong></div>
                <div className="mov-track"><div className="mov-fill" style={{ width: `${movPct}%` }} /></div>
                <div className={`mov-msg${movMet ? " met" : ""}`}>{movMet ? "✓ Mínimo atingido!" : `Adicione mais ${fmt(MOV - cartTotal)}`}</div>
              </div>
              <div className="total-row"><span className="total-label">Total</span><span className="total-value">{fmt(cartTotal)}</span></div>

              {/* Payment method selection */}
              {movMet && cart.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Método de Pagamento</div>
                  <div className="pay-methods">
                    {PAYMENT_METHODS.filter(m => acceptedMethods.includes(m.id)).map(m => (
                      <button key={m.id} className={`pay-method${payMethod === m.id ? " selected" : ""}`} onClick={() => setPayMethod(m.id)}>
                        <span className="pay-method-icon">{m.icon}</span>
                        <span className="pay-method-label">{m.label}</span>
                        <span className="pay-method-desc">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                  {payMethod === "bank_transfer" && paymentSettings && (paymentSettings.banks || []).length > 0 && (
                    <div style={{ background: "var(--green-pale)", border: "1px solid var(--green-pale2)", borderRadius: 9, padding: "10px 13px", fontSize: 12, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.8 }}>
                      {(paymentSettings.banks || []).map((b, i) => (
                        <div key={b.id} style={{ marginBottom: i < paymentSettings.banks.length - 1 ? 8 : 0, paddingBottom: i < paymentSettings.banks.length - 1 ? 8 : 0, borderBottom: i < paymentSettings.banks.length - 1 ? "1px solid var(--green-pale2)" : "none" }}>
                          🏦 <strong>{b.bankName}</strong><br />
                          Titular: {b.accountName}<br />
                          {b.iban && <>IBAN: <strong style={{ fontFamily: "monospace" }}>{b.iban}</strong><br /></>}
                          {b.accountNumber && <>Conta: <strong style={{ fontFamily: "monospace" }}>{b.accountNumber}</strong></>}
                        </div>
                      ))}
                    </div>
                  )}
                  {payMethod === "multicaixa" && paymentSettings && (
                    <div style={{ background: "var(--orange-pale)", border: "1px solid #fed7aa", borderRadius: 9, padding: "10px 13px", fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                      📱 <strong>Multicaixa Express</strong><br />
                      Referência: <strong style={{ fontFamily: "monospace" }}>{paymentSettings.multicaixaRef}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="delivery-note">🚚 Entrega para: {currentUser.address}</div>
              <button className={`checkout-btn${movMet && cart.length > 0 ? " ready" : " not-ready"}`} onClick={movMet ? handleCheckout : undefined} disabled={!movMet || cart.length === 0}>
                {movMet ? `Finalizar · ${selectedPayInfo?.icon || ""} ${selectedPayInfo?.label || ""}` : `Mínimo: ${fmt(MOV)}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Success modal */}
      {success && (
        <div className="modal-overlay">
          <div className="success-modal">
            <div className="success-icon">✅</div>
            <div className="success-title">Encomenda Enviada!</div>
            <div className="success-sub">Recebemos o seu pedido. A nossa equipa confirmará em breve via WhatsApp para o número registado.</div>
            <div className="order-id-box">#{success.id}</div>
            {success.payMethod === "prepaid" && (
              <div style={{ background: "var(--orange-pale)", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--ink-soft)", textAlign: "left" }}>
                💳 <strong>Pré-pago:</strong> Aguardar confirmação de pagamento antes da entrega. Envie o comprovativo via WhatsApp.
              </div>
            )}
            <a href={waLink(`Olá Menamart! Fiz uma encomenda com ID *${success.id}*. Total: *${fmt(success.total)}*. Método: *${PAYMENT_METHODS.find(m=>m.id===success.payMethod)?.label}*. Aguardo confirmação. Obrigado!`)} target="_blank" rel="noreferrer" className="btn-wa" style={{ marginBottom: 12 }}>
              💬 Confirmar via WhatsApp
            </a>
            <button className="btn-green" style={{ width: "100%", padding: 13, fontSize: 15 }} onClick={() => setSuccess(null)}>Voltar ao Catálogo</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Client Account Page ───────────────────────────────────────────────────────
function ClientAccount({ currentUser, setCurrentUser, orders, feedbacks, setFeedbacks, goTo }) {
  const [editing,      setEditing]      = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedForm, setFeedForm] = useState({ type: "Sugestão", message: "", priority: "Normal" });
  const [feedSent, setFeedSent] = useState(false);
  const [form, setForm] = useState({ businessName: currentUser.businessName, contact: currentUser.contact, phone: currentUser.phone, email: currentUser.email || "", address: currentUser.address });

  const myOrders   = orders.filter(o => o.clientId === currentUser.id || o.clientCode === currentUser.code);
  const totalSpent = myOrders.reduce((s, o) => s + o.total, 0);

  const save = () => { setCurrentUser(u => ({ ...u, ...form })); setEditing(false); };

  const submitFeedback = () => {
    if (!feedForm.message.trim()) return;
    const fb = {
      id: genId(),
      clientId: currentUser.id,
      clientName: currentUser.businessName,
      clientCode: currentUser.code,
      type: feedForm.type,
      priority: feedForm.priority,
      message: feedForm.message,
      date: new Date().toISOString().split("T")[0],
      status: "Novo",
    };
    setFeedbacks(prev => [fb, ...prev]);
    setFeedSent(true);
    setTimeout(() => { setFeedSent(false); setShowFeedback(false); setFeedForm({ type: "Sugestão", message: "", priority: "Normal" }); }, 2500);
  };

  return (
    <div style={{ background: "var(--off-white)", minHeight: "60vh" }}>
      <div style={{ background: "linear-gradient(160deg,var(--green-dark),var(--green))", padding: "44px 24px 36px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, letterSpacing: ".18em", color: "rgba(255,255,255,.45)", textTransform: "uppercase", marginBottom: 10 }}>A Minha Conta</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px,4vw,32px)", color: "#fff", marginBottom: 12 }}>{currentUser.businessName}</h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[`🔑 ${currentUser.code}`, `📦 ${myOrders.length} encomendas`, `💰 ${fmt(totalSpent)}`].map((t, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,.12)", borderRadius: 100, padding: "5px 14px", fontSize: 12, fontFamily: "var(--font-ui)", fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="section" style={{ maxWidth: 900 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24, alignItems: "start" }}>
          {/* Profile */}
          <div>
            <div style={{ background: "var(--white)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1.5px solid var(--border)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Dados da Empresa</div>
                {!editing && <button className="btn-sm btn-gray" onClick={() => setEditing(true)}>✏️ Editar</button>}
              </div>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[["Nome da Empresa", "businessName"], ["Responsável", "contact"], ["Telefone", "phone"], ["Email", "email"], ["Endereço de Entrega", "address"]].map(([l, k]) => (
                    <div key={k}><label className="form-label">{l}</label><input type="text" className="form-input" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} /></div>
                  ))}
                  <div style={{ display: "flex", gap: 8 }}><button className="btn-green" style={{ flex: 1, padding: 10 }} onClick={save}>✅ Guardar</button><button className="btn-sm btn-gray" style={{ padding: "10px 16px" }} onClick={() => setEditing(false)}>Cancelar</button></div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[["🏢", "Empresa", currentUser.businessName], ["👤", "Responsável", currentUser.contact], ["📱", "Telefone", currentUser.phone], ["📧", "Email", currentUser.email || "—"], ["📍", "Entrega", currentUser.address]].map(([icon, label, value], i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--off-white)" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                      <div><div style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div><div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginTop: 1 }}>{value}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback button */}
            <button className="btn-outline" style={{ width: "100%", padding: 12, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setShowFeedback(true)}>
              💡 Sugerir Melhoria à App
            </button>

            <div style={{ background: "#fff8e1", border: "1.5px solid #fcd34d", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>🔑 O seu código</div>
              <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: "#78350F", textAlign: "center", padding: "8px 0" }}>{currentUser.code}</div>
              <a href={waLink(`Olá Menamart! Esqueci o meu código de acesso. Empresa: ${currentUser.businessName}. Por favor reenviem. Obrigado!`)} target="_blank" rel="noreferrer" className="btn-wa" style={{ fontSize: 13, padding: "9px 14px", marginTop: 8 }}>💬 Pedir via WhatsApp</a>
            </div>
          </div>

          {/* Orders */}
          <div style={{ background: "var(--white)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1.5px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Histórico de Encomendas</div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--green)" }}>{fmt(totalSpent)}</span>
            </div>
            {myOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-muted)" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
                <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, marginBottom: 12 }}>Ainda sem encomendas</div>
                <button className="btn-green" onClick={() => goTo("catalog")}>Ir ao Catálogo →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myOrders.map(o => {
                  const c = STATUS_COLORS[o.status] || "#999";
                  const pm = PAYMENT_METHODS.find(m => m.id === o.paymentMethod);
                  return (
                    <div key={o.id} style={{ background: "var(--off-white)", borderRadius: 10, padding: "12px 14px", border: "1.5px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <strong style={{ fontFamily: "monospace", color: "var(--ink)", fontSize: 13 }}>{o.id}</strong>
                        <span style={{ background: `${c}18`, color: c, padding: "3px 9px", borderRadius: 100, fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700 }}>{o.status}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{o.date} {pm && `· ${pm.icon} ${pm.label}`}</span>
                        <span style={{ fontFamily: "var(--font-display)", color: "var(--green)", fontSize: 15 }}>{fmt(o.total)}</span>
                      </div>
                    </div>
                  );
                })}
                <div style={{ background: "linear-gradient(135deg,var(--green),var(--green-dark))", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,.7)", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 }}>Total gasto</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#fff" }}>{fmt(totalSpent)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback modal */}
      {showFeedback && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h2>💡 Sugerir Melhoria</h2>
              <p>A sua opinião ajuda-nos a melhorar a Menamart</p>
            </div>
            <div className="modal-body">
              {feedSent ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--green)" }}>Obrigado!</div>
                  <p style={{ color: "var(--ink-muted)", marginTop: 8, fontWeight: 300 }}>A sua sugestão foi registada.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div className="admin-form-field"><label>Tipo</label><select value={feedForm.type} onChange={e => setFeedForm(f => ({ ...f, type: e.target.value }))}>{["Sugestão", "Erro/Bug", "Novo Produto", "Melhoria de Design", "Outro"].map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className="admin-form-field"><label>Prioridade</label><select value={feedForm.priority} onChange={e => setFeedForm(f => ({ ...f, priority: e.target.value }))}>{["Normal", "Importante", "Urgente"].map(t => <option key={t}>{t}</option>)}</select></div>
                  </div>
                  <div className="admin-form-field" style={{ marginBottom: 16 }}>
                    <label>A sua sugestão *</label>
                    <textarea value={feedForm.message} onChange={e => setFeedForm(f => ({ ...f, message: e.target.value }))} placeholder="Descreva a melhoria que gostaria de ver na próxima versão da Menamart..." rows={5} style={{ resize: "vertical", padding: "10px 13px", border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 14, outline: "none", width: "100%" }} />
                  </div>
                  <button className="modal-submit" onClick={submitFeedback}>Enviar Sugestão</button>
                  <button className="modal-back" onClick={() => setShowFeedback(false)}>Cancelar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 8. ADMIN PAGES
// =============================================================================

// ── Dashboard ─────────────────────────────────────────────────────────────────
function AdminDashboard({ products, orders, clients, categories, feedbacks }) {
  const revenue = orders.filter(o => o.status === "Delivered").reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === "Pending").length;
  const newFeedbacks = feedbacks.filter(f => f.status === "Novo").length;
  return (
    <div>
      <div className="admin-title">Painel de Controlo</div>
      <div className="admin-sub">Menamart v{APP_VERSION} — Luanda, Angola</div>
      <div className="stats-row">
        {[
          { icon: "💰", v: fmt(revenue), l: "Receita Total", n: "Encomendas entregues" },
          { icon: "🛒", v: orders.length, l: "Total Encomendas", n: `${pending} pendentes` },
          { icon: "👥", v: clients.length, l: "Clientes Activos", n: "Empresas verificadas" },
          { icon: "📦", v: products.filter(p => p.stock).length, l: "Produtos em Stock", n: `${products.filter(p => !p.stock).length} esgotados` },
          { icon: "💡", v: newFeedbacks, l: "Sugestões Novas", n: "De clientes" },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.v}</div>
            <div className="stat-label">{s.l}</div>
            <div className="stat-note">{s.n}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Encomendas Recentes</div></div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Estado</th><th>Data</th></tr></thead>
            <tbody>
              {orders.slice(0, 12).map(o => {
                const c = STATUS_COLORS[o.status] || "#999";
                const pm = PAYMENT_METHODS.find(m => m.id === o.paymentMethod);
                return (
                  <tr key={o.id}>
                    <td><strong style={{ fontFamily: "monospace" }}>{o.id}</strong></td>
                    <td style={{ fontWeight: 700 }}>{o.clientName}</td>
                    <td style={{ fontFamily: "var(--font-display)", color: "var(--green)", fontSize: 15 }}>{fmt(o.total)}</td>
                    <td><span style={{ fontFamily: "var(--font-ui)", fontSize: 12 }}>{pm ? `${pm.icon} ${pm.label}` : "—"}</span></td>
                    <td><span className="status-badge" style={{ background: `${c}18`, color: c }}><span className="status-dot" style={{ background: c }} />{o.status}</span></td>
                    <td style={{ fontSize: 12 }}>{o.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Clients Manager ────────────────────────────────────────────────────────────
function AdminClients({ clients, setClients, orders }) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const empty = { businessName: "", type: "Restaurante", contact: "", phone: "", email: "", nif: "", address: "", code: "" };
  const [form, setForm] = useState(empty);

  const nextCode = () => {
    const nums = clients.map(c => parseInt(c.code.replace("MN-", "")) || 0);
    return "MN-" + String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, "0");
  };

  const openNew  = ()      => { setForm({ ...empty, code: nextCode() }); setEditId(null); setShowForm(true); };
  const openEdit = client  => { setForm({ ...client }); setEditId(client.id); setShowForm(true); };
  const save     = ()      => {
    if (!form.businessName || !form.contact || !form.code) return;
    if (editId) setClients(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c));
    else        setClients(prev => [...prev, { ...form, id: genId(), approved: true }]);
    setShowForm(false); setEditId(null);
  };
  const remove = id => { if (window.confirm("Remover este cliente?")) setClients(prev => prev.filter(c => c.id !== id)); };
  const clientTotal = id => orders.filter(o => o.clientId === id).reduce((s, o) => s + o.total, 0);

  // WhatsApp welcome message
  const sendWelcome = client => {
    const msg = `✅ *Bem-vindo à Menamart!*\n\nOlá *${client.contact}* (${client.businessName})!\n\nA sua conta foi aprovada.\n\n🔑 *O seu código de acesso:*\n\`${client.code}\`\n\n🌐 Aceda à plataforma e insira o código para entrar.\n\nQualquer dúvida estamos aqui!\n_Equipa Menamart_`;
    const phone = (client.phone || "").replace(/\D/g, "");
    window.open(waLink(msg, phone || WA_NUMBER), "_blank");
  };

  return (
    <div>
      <div className="admin-title">Gestão de Clientes</div>
      <div className="admin-sub">Adicione, edite e envie códigos de acesso a clientes verificados. Todos os clientes são registados manualmente.</div>

      {showForm && (
        <div className="form-section">
          <div className="form-section-title">{editId ? "✏️ Editar Cliente" : "➕ Novo Cliente"}</div>
          <div className="admin-form-grid">
            <div className="admin-form-field admin-form-full"><label>Nome da Empresa *</label><input type="text" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Ex: Hotel Intercontinental" /></div>
            <div className="admin-form-field"><label>Tipo</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{["Restaurante", "Hotel", "Catering", "Café", "Supermercado", "Outro"].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="admin-form-field"><label>Código *</label><input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MN-001" style={{ fontFamily: "monospace", fontWeight: 900, color: "var(--green)", fontSize: 16 }} /></div>
            <div className="admin-form-field"><label>Responsável *</label><input type="text" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Nome completo" /></div>
            <div className="admin-form-field"><label>NIF</label><input type="text" value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} placeholder="5417XXXXXXX" /></div>
            <div className="admin-form-field"><label>Telefone (com código país)</label><input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+244 9XX XXX XXX" /></div>
            <div className="admin-form-field"><label>Email</label><input type="text" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.ao" /></div>
            <div className="admin-form-field admin-form-full"><label>Endereço de Entrega</label><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Bairro, Município, Luanda" /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn-green" onClick={save}>{editId ? "Guardar" : "Adicionar Cliente"}</button>
            <button className="btn-sm btn-gray" style={{ padding: "9px 18px" }} onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Clientes ({clients.length})</div>
          <button className="btn-green btn-sm" onClick={openNew}>+ Novo Cliente</button>
        </div>
        {clients.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-muted)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, marginBottom: 8 }}>Ainda sem clientes</div>
            <div style={{ fontSize: 13, marginBottom: 20, fontWeight: 300 }}>Clique em "+ Novo Cliente" para registar o primeiro cliente.</div>
            <button className="btn-green" onClick={openNew}>+ Registar Primeiro Cliente</button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Código</th><th>Empresa</th><th>Tipo</th><th>Responsável</th><th>Telefone</th><th>Total Compras</th><th>Morada</th><th></th></tr></thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ background: "var(--green-pale)", border: "2px solid var(--green-light)", borderRadius: 9, padding: "6px 12px", textAlign: "center", minWidth: 88, display: "inline-block" }}>
                        <div style={{ fontFamily: "monospace", color: "var(--green)", fontSize: 16, fontWeight: 900 }}>{c.code}</div>
                      </div>
                    </td>
                    <td><div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>{c.businessName}</div><div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{c.nif || "sem NIF"}</div></td>
                    <td><span className="tag">{c.type}</span></td>
                    <td style={{ fontWeight: 700 }}>{c.contact}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{c.phone}</td>
                    <td style={{ fontFamily: "var(--font-display)", color: "var(--green)", fontSize: 15 }}>{fmt(clientTotal(c.id))}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-muted)" }}>{c.address}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button className="btn-sm" style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 12 }} onClick={() => sendWelcome(c)} title="Enviar código via WhatsApp">💬</button>
                        <button className="btn-sm btn-gray" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn-sm btn-red" onClick={() => remove(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="info-box">
        💡 <strong>Fluxo:</strong> 1) Clique "+ Novo Cliente" → 2) Preencha os dados → 3) O sistema gera o código automaticamente → 4) Clique 💬 para enviar o código via WhatsApp ao cliente.
      </div>
    </div>
  );
}

// ── Products Manager ───────────────────────────────────────────────────────────
function AdminProducts({ products, setProducts, categories }) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const defCat = categories.length > 0 ? categories[0].name : "";
  const empty  = { name: "", sub: "", category: defCat, costPrice: "", sellingPrice: "", img: "", stock: true };
  const [form, setForm] = useState(empty);
  const [calc, setCalc] = useState({ cost: "", pct: "" });
  const calcResult = calc.cost && calc.pct ? parseFloat(calc.cost) * (1 + parseFloat(calc.pct) / 100) : null;

  const openNew  = ()  => { setForm({ ...empty, category: defCat }); setEditId(null); setShowForm(true); };
  const openEdit = p   => { setForm({ ...p, costPrice: p.costPrice, sellingPrice: p.sellingPrice }); setEditId(p.id); setShowForm(true); };
  const save     = ()  => {
    if (!form.name || !form.sellingPrice) return;
    const entry = { ...form, sellingPrice: parseFloat(form.sellingPrice), costPrice: parseFloat(form.costPrice || 0) };
    if (editId) setProducts(prev => prev.map(p => p.id === editId ? { ...p, ...entry } : p));
    else        setProducts(prev => [...prev, { ...entry, id: genId() }]);
    setShowForm(false); setEditId(null);
  };
  const remove      = id => { if (window.confirm("Apagar produto?")) setProducts(prev => prev.filter(p => p.id !== id)); };
  const toggleStock = id => setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: !p.stock } : p));

  return (
    <div>
      <div className="admin-title">Gestão de Produtos</div>
      <div className="admin-sub">Adicione, edite e controle o stock. Fotos podem ser carregadas do PC ou via URL.</div>
      <div className="margin-calc">
        <div className="margin-calc-title">🧮 Calculadora de Margem</div>
        <div className="margin-calc-grid">
          <div className="margin-input-field"><label>Preço de Custo (AKZ)</label><input type="number" placeholder="0" value={calc.cost} onChange={e => setCalc(c => ({ ...c, cost: e.target.value }))} /></div>
          <div className="margin-input-field"><label>Margem (%)</label><input type="number" placeholder="30" value={calc.pct} onChange={e => setCalc(c => ({ ...c, pct: e.target.value }))} /></div>
          <div className="margin-input-field"><label>Preço de Venda</label><input readOnly value={calcResult ? Math.round(calcResult).toLocaleString("pt-AO") : ""} placeholder="—" style={{ color: "#a8e6a8", fontWeight: 800 }} /></div>
        </div>
        {calcResult && <div className="margin-result"><span className="margin-result-label">Preço sugerido</span><span className="margin-result-value">{fmt(calcResult)}</span></div>}
      </div>

      {showForm && (
        <div className="form-section">
          <div className="form-section-title">{editId ? "✏️ Editar Produto" : "➕ Novo Produto"}</div>
          <div className="admin-form-grid">
            <div className="admin-form-field admin-form-full"><label>Nome *</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Arroz Carolino" /></div>
            <div className="admin-form-field"><label>Sub-título</label><input type="text" value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))} placeholder="Ex: Saco 25kg" /></div>
            <div className="admin-form-field"><label>Categoria</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{categories.map(c => <option key={c.name}>{c.name}</option>)}</select></div>
            <div className="admin-form-field"><label>Preço de Custo — Interno (AKZ)</label><input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
            <div className="admin-form-field"><label>Preço de Venda — Público (AKZ) *</label><input type="number" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} /></div>
            <div className="admin-form-field admin-form-full">
              <PhotoUpload value={form.img} onChange={v => setForm(f => ({ ...f, img: v }))} label="Foto do Produto (carregue do PC ou URL)" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn-green" onClick={save}>{editId ? "Guardar" : "Adicionar"}</button>
            <button className="btn-sm btn-gray" style={{ padding: "9px 18px" }} onClick={() => { setShowForm(false); setEditId(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title">Catálogo ({products.length})</div><button className="btn-green btn-sm" onClick={openNew}>+ Novo Produto</button></div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Produto</th><th>Categoria</th><th>Custo</th><th>Venda</th><th>Margem</th><th>Stock</th><th></th></tr></thead>
            <tbody>
              {products.map(p => {
                const margin = p.costPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.costPrice) * 100).toFixed(0) : null;
                return (
                  <tr key={p.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src={p.img} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: "cover", background: "var(--gray)" }} onError={e => { e.target.style.display = "none"; }} /><div><div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{p.sub}</div></div></div></td>
                    <td><span className="tag">{p.category}</span></td>
                    <td style={{ color: "var(--ink-muted)", fontSize: 12 }}>{fmt(p.costPrice)}</td>
                    <td style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>{fmt(p.sellingPrice)}</td>
                    <td><span style={{ color: "var(--green)", fontFamily: "var(--font-ui)", fontWeight: 700 }}>{margin ? `+${margin}%` : "—"}</span></td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <label className="toggle"><input type="checkbox" checked={p.stock} onChange={() => toggleStock(p.id)} /><span className="toggle-slider" /></label>
                        <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, fontWeight: 700, color: p.stock ? "var(--green)" : "#DC2626", textTransform: "uppercase" }}>{p.stock ? "Stock" : "Esgot."}</span>
                      </div>
                    </td>
                    <td><div style={{ display: "flex", gap: 5 }}><button className="btn-sm btn-gray" onClick={() => openEdit(p)}>✏️</button><button className="btn-sm btn-red" onClick={() => remove(p.id)}>🗑️</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Categories Manager ────────────────────────────────────────────────────────
function AdminCategories({ categories, setCategories, products }) {
  const [showForm, setShowForm] = useState(false);
  const [editIdx,  setEditIdx]  = useState(null);
  const [form,     setForm]     = useState({ name: "", img: "" });
  const [error,    setError]    = useState("");
  const count = name => products.filter(p => p.category === name).length;
  const openNew  = ()        => { setForm({ name: "", img: "" }); setEditIdx(null); setError(""); setShowForm(true); };
  const openEdit = (c, idx)  => { setForm({ name: c.name, img: c.img }); setEditIdx(idx); setError(""); setShowForm(true); };
  const save = () => {
    const name = form.name.trim();
    if (!name) { setError("Nome obrigatório."); return; }
    if (categories.find((c, i) => c.name.toLowerCase() === name.toLowerCase() && i !== editIdx)) { setError("Já existe esta categoria."); return; }
    if (editIdx !== null) setCategories(prev => prev.map((c, i) => i === editIdx ? { name, img: form.img } : c));
    else setCategories(prev => [...prev, { name, img: form.img }]);
    setShowForm(false); setEditIdx(null);
  };
  const remove = idx => {
    if (count(categories[idx].name) > 0) { alert(`Esta categoria tem ${count(categories[idx].name)} produto(s). Reatribua primeiro.`); return; }
    if (window.confirm("Apagar categoria?")) setCategories(prev => prev.filter((_, i) => i !== idx));
  };
  return (
    <div>
      <div className="admin-title">Gestão de Categorias</div>
      <div className="admin-sub">As categorias aparecem no catálogo dos clientes.</div>
      {showForm && (
        <div className="form-section">
          <div className="form-section-title">{editIdx !== null ? "✏️ Editar" : "➕ Nova Categoria"}</div>
          {error && <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 14 }}>{error}</div>}
          <div className="admin-form-grid">
            <div className="admin-form-field"><label>Nome *</label><input type="text" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(""); }} placeholder="Ex: Lacticínios" /></div>
            <div className="admin-form-field"><label>URL da Imagem</label><input type="text" value={form.img} onChange={e => setForm(f => ({ ...f, img: e.target.value }))} placeholder="https://..." /></div>
            <div className="admin-form-field admin-form-full"><PhotoUpload value={form.img} onChange={v => setForm(f => ({ ...f, img: v }))} label="Ou carregar do PC" /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn-green" onClick={save}>{editIdx !== null ? "Guardar" : "Criar"}</button>
            <button className="btn-sm btn-gray" style={{ padding: "9px 18px" }} onClick={() => { setShowForm(false); setEditIdx(null); setError(""); }}>Cancelar</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header"><div className="card-title">Categorias ({categories.length})</div><button className="btn-green btn-sm" onClick={openNew}>+ Nova</button></div>
        <div className="cat-admin-grid">
          {categories.map((c, i) => (
            <div key={i} className="cat-admin-card">
              {c.img ? <img src={c.img} alt={c.name} onError={e => { e.target.style.display = "none"; }} /> : <div style={{ height: 80, background: "var(--green-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🗂️</div>}
              <div className="cat-admin-card-body">
                <div><div className="cat-admin-card-name">{c.name}</div><div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{count(c.name)} produto(s)</div></div>
                <div style={{ display: "flex", gap: 5 }}><button className="btn-sm btn-gray" onClick={() => openEdit(c, i)}>✏️</button><button className="btn-sm btn-red" onClick={() => remove(i)}>🗑️</button></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Orders Manager ─────────────────────────────────────────────────────────────
function AdminOrders({ orders, setOrders, clients }) {
  const [filter, setFilter] = useState("All");
  const list = filter === "All" ? orders : orders.filter(o => o.status === filter);

  const getPhone = order => {
    const c = clients.find(cl => cl.id === order.clientId || cl.code === order.clientCode);
    return (c?.phone || order.clientPhone || "").replace(/\D/g, "") || WA_NUMBER;
  };

  // WhatsApp: order confirmed
  const sendConfirm = order => {
    const phone = getPhone(order);
    const pm = PAYMENT_METHODS.find(m => m.id === order.paymentMethod);
    const msg = `✅ *Encomenda Confirmada — Menamart*\n\nOlá *${order.clientName}*!\n\nA sua encomenda foi recebida e confirmada.\n\n📦 *ID:* ${order.id}\n💰 *Total:* ${fmt(order.total)}\n${pm ? `💳 *Pagamento:* ${pm.icon} ${pm.label}\n` : ""}📍 *Entrega:* ${order.address}\n🚚 *Entrega prevista:* Hoje entre 07:00–18:00\n\nObrigado pela confiança! 🙏\n_Equipa Menamart_`;
    window.open(waLink(msg, phone), "_blank");
  };

  // WhatsApp: out for delivery
  const sendOutForDelivery = order => {
    const phone = getPhone(order);
    const msg = `🚚 *A caminho! — Menamart*\n\nOlá *${order.clientName}*!\n\nA sua encomenda *${order.id}* saiu para entrega.\n\nO nosso estafeta chegará em breve ao endereço:\n📍 ${order.address}\n\nQualquer questão, contacte-nos aqui!\n_Equipa Menamart_`;
    window.open(waLink(msg, phone), "_blank");
  };

  // WhatsApp: delivered
  const sendDelivered = order => {
    const phone = getPhone(order);
    const msg = `🎉 *Entregue com Sucesso! — Menamart*\n\nOlá *${order.clientName}*!\n\nA sua encomenda *${order.id}* foi entregue.\n\n💰 *Total:* ${fmt(order.total)}\n\nObrigado por escolher a Menamart!\nEsperamos vê-lo novamente em breve. 🙏\n\n_Equipa Menamart — Luanda_`;
    window.open(waLink(msg, phone), "_blank");
  };

  return (
    <div>
      <div className="admin-title">Gestão de Encomendas</div>
      <div className="admin-sub">Confirme encomendas, actualize estados e envie notificações WhatsApp ao cliente em cada passo.</div>
      <div className="pills" style={{ marginBottom: 20 }}>
        {["All", ...STATUS_FLOW].map(s => <button key={s} className={`pill${filter === s ? " active" : ""}`} onClick={() => setFilter(s)}>{s === "All" ? "Todas" : s}</button>)}
      </div>
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Estado</th><th>Data</th><th>WhatsApp</th></tr></thead>
            <tbody>
              {list.map(o => {
                const c = STATUS_COLORS[o.status] || "#999";
                const pm = PAYMENT_METHODS.find(m => m.id === o.paymentMethod);
                return (
                  <tr key={o.id}>
                    <td><strong style={{ fontFamily: "monospace" }}>{o.id}</strong></td>
                    <td><div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>{o.clientName}</div><div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{o.address}</div></td>
                    <td style={{ fontFamily: "var(--font-display)", color: "var(--green)", fontSize: 15 }}>{fmt(o.total)}</td>
                    <td><span style={{ fontFamily: "var(--font-ui)", fontSize: 12 }}>{pm ? `${pm.icon} ${pm.label}` : "—"}</span></td>
                    <td>
                      <select className="status-select" value={o.status} onChange={e => setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: e.target.value } : x))} style={{ borderColor: `${c}80`, color: c, background: `${c}12` }}>
                        {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 12 }}>{o.date}</td>
                    <td>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button className="btn-sm" style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 11 }} onClick={() => sendConfirm(o)} title="Confirmar encomenda">✅</button>
                        <button className="btn-sm" style={{ background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 11 }} onClick={() => sendOutForDelivery(o)} title="A caminho">🚚</button>
                        <button className="btn-sm" style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 11 }} onClick={() => sendDelivered(o)} title="Entregue">🎉</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="info-box">
        💬 <strong>Botões WhatsApp:</strong> ✅ Confirmar recepção · 🚚 Informar saída para entrega · 🎉 Confirmar entrega. Cada botão abre o WhatsApp com uma mensagem pré-escrita para o número do cliente.
      </div>
    </div>
  );
}

// ── Payment Gateway Settings — Multi-bank ─────────────────────────────────────
function AdminPaymentGateway({ paymentSettings, setPaymentSettings }) {
  const [form,      setForm]      = useState(() => ({
    ...paymentSettings,
    banks: paymentSettings.banks || [],
  }));
  const [saved,     setSaved]     = useState(false);
  const [editBank,  setEditBank]  = useState(null); // null | "new" | bankId
  const [bankForm,  setBankForm]  = useState({ bankName: "", accountName: "", iban: "", accountNumber: "" });

  const save = () => { setPaymentSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  // Bank CRUD
  const openNewBank  = ()  => { setBankForm({ bankName: "", accountName: "", iban: "", accountNumber: "" }); setEditBank("new"); };
  const openEditBank = (b) => { setBankForm({ ...b }); setEditBank(b.id); };
  const saveBank     = ()  => {
    if (!bankForm.bankName || !bankForm.accountName) return;
    if (editBank === "new") {
      const nb = { ...bankForm, id: "b" + Date.now() };
      setForm(f => ({ ...f, banks: [...(f.banks || []), nb] }));
    } else {
      setForm(f => ({ ...f, banks: f.banks.map(b => b.id === editBank ? { ...b, ...bankForm } : b) }));
    }
    setEditBank(null);
  };
  const removeBank = id => {
    if (window.confirm("Remover este banco?"))
      setForm(f => ({ ...f, banks: f.banks.filter(b => b.id !== id) }));
  };

  const ANGOLA_BANKS = ["Banco BFA","Banco BIC","Banco BAI","Banco Millennium Atlântico","Banco Sol","Banco de Poupança e Crédito (BPC)","Banco Económico","Standard Bank Angola","Banco de Fomento Angola (BFA)","Outro"];

  return (
    <div>
      <div className="admin-title">Gateway de Pagamento</div>
      <div className="admin-sub">Configure métodos de pagamento, <strong>múltiplos bancos</strong> e preferências de recebimento.</div>

      {saved && <div style={{ background: "var(--green-pale)", border: "1.5px solid var(--green-pale2)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontFamily: "var(--font-ui)", fontWeight: 700, color: "var(--green)" }}>✅ Definições guardadas!</div>}

      {/* ── Accepted methods ── */}
      <div className="pay-gw-card">
        <div className="pay-gw-title">🔘 Métodos de Pagamento Aceites</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12, marginBottom: 16 }}>
          {PAYMENT_METHODS.map(m => (
            <label key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", border: `1.5px solid ${form.acceptedMethods.includes(m.id) ? "var(--green-light)" : "var(--border)"}`, borderRadius: 10, background: form.acceptedMethods.includes(m.id) ? "var(--green-pale)" : "var(--white)", cursor: "pointer", transition: "all .18s" }}>
              <input type="checkbox" checked={form.acceptedMethods.includes(m.id)} onChange={e => {
                if (e.target.checked) setForm(f => ({ ...f, acceptedMethods: [...f.acceptedMethods, m.id] }));
                else setForm(f => ({ ...f, acceptedMethods: f.acceptedMethods.filter(x => x !== m.id) }));
              }} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>{m.icon} {m.label}</div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", fontWeight: 300 }}>{m.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="admin-form-field">
            <label>Método por Defeito</label>
            <select value={form.defaultMethod} onChange={e => setForm(f => ({ ...f, defaultMethod: e.target.value }))}>
              {form.acceptedMethods.map(id => { const m = PAYMENT_METHODS.find(x => x.id === id); return <option key={id} value={id}>{m?.icon} {m?.label}</option>; })}
            </select>
          </div>
          <div className="admin-form-field">
            <label>Multicaixa Express (Referência)</label>
            <input type="text" value={form.multicaixaRef} onChange={e => setForm(f => ({ ...f, multicaixaRef: e.target.value }))} placeholder="9XX XXX XXX" style={{ fontFamily: "monospace" }} />
          </div>
        </div>
      </div>

      {/* ── Banks list ── */}
      <div className="pay-gw-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1.5px solid var(--border)" }}>
          <div className="pay-gw-title" style={{ margin: 0, padding: 0, border: "none" }}>🏦 Contas Bancárias ({(form.banks || []).length})</div>
          <button className="btn-green btn-sm" onClick={openNewBank}>+ Adicionar Banco</button>
        </div>

        {/* Add / Edit bank form */}
        {editBank && (
          <div style={{ background: "var(--off-white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 18 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 14, color: "var(--ink)" }}>
              {editBank === "new" ? "➕ Novo Banco" : "✏️ Editar Banco"}
            </div>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label>Nome do Banco *</label>
                <select value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))}>
                  <option value="">Seleccionar banco...</option>
                  {ANGOLA_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="admin-form-field">
                <label>Nome do Titular da Conta *</label>
                <input type="text" value={bankForm.accountName} onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))} placeholder="Ex: Menamart Lda" />
              </div>
              <div className="admin-form-field admin-form-full">
                <label>IBAN</label>
                <input type="text" value={bankForm.iban} onChange={e => setBankForm(f => ({ ...f, iban: e.target.value }))} placeholder="AO06.0040.0000.0000.0000.XXXX.X" style={{ fontFamily: "monospace" }} />
              </div>
              <div className="admin-form-field">
                <label>Número de Conta (opcional)</label>
                <input type="text" value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="XXXXXXXXXX" style={{ fontFamily: "monospace" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn-green" onClick={saveBank}>{editBank === "new" ? "Adicionar" : "Guardar"}</button>
              <button className="btn-sm btn-gray" style={{ padding: "9px 16px" }} onClick={() => setEditBank(null)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Banks table */}
        {(form.banks || []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--ink-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏦</div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, marginBottom: 6 }}>Sem contas bancárias</div>
            <div style={{ fontSize: 13, fontWeight: 300, marginBottom: 14 }}>Clique "+ Adicionar Banco" para registar a primeira conta.</div>
            <button className="btn-green" onClick={openNewBank}>+ Adicionar Primeiro Banco</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(form.banks || []).map((b, i) => (
              <div key={b.id} style={{ background: "var(--white)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--green-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏦</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 14, color: "var(--ink)", marginBottom: 2 }}>{b.bankName}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 2 }}>Titular: <strong>{b.accountName}</strong></div>
                  {b.iban && <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--ink-muted)" }}>IBAN: {b.iban}</div>}
                  {b.accountNumber && <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--ink-muted)" }}>Conta: {b.accountNumber}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="btn-sm btn-gray" onClick={() => openEditBank(b)}>✏️ Editar</button>
                  <button className="btn-sm btn-red" onClick={() => removeBank(b.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="pay-gw-card">
        <div className="pay-gw-title">📝 Notas de Pagamento</div>
        <div className="admin-form-field">
          <label>Texto visível ao cliente quando selecciona transferência</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ resize: "vertical", padding: "10px 13px", border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: 13, outline: "none", width: "100%" }} />
        </div>
      </div>

      {/* ── Preview ── */}
      {(form.banks || []).length > 0 && (
        <div className="pay-gw-card" style={{ background: "var(--green-pale)", border: "1.5px solid var(--green-pale2)" }}>
          <div className="pay-gw-title" style={{ borderBottomColor: "var(--green-pale2)" }}>👁️ Pré-visualização — O que o cliente vê</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(form.banks || []).map((b, i) => (
              <div key={b.id} style={{ background: "var(--white)", borderRadius: 10, padding: "12px 16px", border: "1px solid var(--green-pale2)" }}>
                <div style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 13, color: "var(--green)", marginBottom: 6 }}>🏦 {b.bankName}</div>
                {[["Titular", b.accountName], ["IBAN", b.iban], ["Conta", b.accountNumber]].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} className="bank-detail-row">
                    <span className="bank-detail-label">{l}</span>
                    <span className="bank-detail-value" style={{ fontFamily: "monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
            {form.notes && <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, fontWeight: 300 }}>ℹ️ {form.notes}</div>}
          </div>
        </div>
      )}

      <button className="btn-green" style={{ padding: "12px 28px", fontSize: 15 }} onClick={save}>💾 Guardar Definições</button>
    </div>
  );
}

// ── Feedbacks ──────────────────────────────────────────────────────────────────
function AdminFeedbacks({ feedbacks, setFeedbacks }) {
  const typeColors = { "Sugestão": "#3B82F6", "Erro/Bug": "#DC2626", "Novo Produto": "#16A34A", "Melhoria de Design": "#8B5CF6", "Outro": "#F59E0B" };
  const priorityColors = { "Normal": "#6B7280", "Importante": "#F59E0B", "Urgente": "#DC2626" };
  const markRead = id => setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: "Lido" } : f));
  const remove   = id => setFeedbacks(prev => prev.filter(f => f.id !== id));

  return (
    <div>
      <div className="admin-title">Sugestões de Clientes</div>
      <div className="admin-sub">Feedback e sugestões de melhoria submetidos pelos clientes para a próxima versão da plataforma.</div>
      {feedbacks.length === 0 ? (
        <div style={{ background: "var(--white)", borderRadius: 16, padding: "48px 24px", textAlign: "center", color: "var(--ink-muted)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, marginBottom: 8 }}>Ainda sem sugestões</div>
          <div style={{ fontSize: 13, fontWeight: 300 }}>Os clientes podem submeter sugestões a partir da página "A Minha Conta".</div>
        </div>
      ) : (
        feedbacks.map(f => {
          const tc = typeColors[f.type] || "#6B7280";
          const pc = priorityColors[f.priority] || "#6B7280";
          return (
            <div key={f.id} className="feedback-card" style={{ opacity: f.status === "Lido" ? .7 : 1 }}>
              <span className="feedback-type-badge" style={{ background: `${tc}18`, color: tc }}>{f.type}</span>
              <div className="feedback-date">{f.date} · <span style={{ color: pc, fontWeight: 700 }}>{f.priority}</span> · <span style={{ color: f.status === "Novo" ? "var(--orange)" : "var(--ink-muted)" }}>{f.status}</span></div>
              <div className="feedback-company">👤 {f.clientName} ({f.clientCode})</div>
              <div className="feedback-msg">{f.message}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {f.status === "Novo" && <button className="btn-sm btn-gray" onClick={() => markRead(f.id)}>✓ Marcar como lido</button>}
                <button className="btn-sm btn-red" onClick={() => remove(f.id)}>🗑️</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Security Panel ─────────────────────────────────────────────────────────────
function AdminSecurity({ adminPassword, setAdminPassword, securityLog }) {
  const [cur, setCur] = useState("");
  const [nw,  setNw]  = useState("");
  const [cnf, setCnf] = useState("");
  const [msg, setMsg] = useState(null);

  const changePw = () => {
    if (!cur || !nw || !cnf)  { setMsg({ e: true, t: "Preencha todos os campos." }); return; }
    if (cur !== adminPassword) { setMsg({ e: true, t: "Senha actual incorrecta." }); return; }
    if (nw.length < 10)        { setMsg({ e: true, t: "Nova senha: mínimo 10 caracteres." }); return; }
    if (nw !== cnf)            { setMsg({ e: true, t: "Nova senha e confirmação não coincidem." }); return; }
    setAdminPassword(nw);
    setCur(""); setNw(""); setCnf("");
    setMsg({ e: false, t: "✅ Senha alterada com sucesso!" });
  };

  return (
    <div>
      <div className="admin-title">Segurança</div>
      <div className="admin-sub">Altere a senha de admin e veja o registo de tentativas de acesso.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" }}>
        <div className="form-section" style={{ marginBottom: 0 }}>
          <div className="form-section-title">🔑 Alterar Senha de Admin</div>
          {msg && <div style={{ background: msg.e ? "#FEE2E2" : "var(--green-pale)", border: `1px solid ${msg.e ? "#FCA5A5" : "var(--green-pale2)"}`, borderRadius: 9, padding: "11px 14px", fontSize: 13, color: msg.e ? "#DC2626" : "var(--green)", marginBottom: 14, fontFamily: "var(--font-ui)", fontWeight: 700 }}>{msg.t}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[["Senha Actual", cur, setCur], ["Nova Senha (mín. 10 caracteres)", nw, setNw], ["Confirmar Nova Senha", cnf, setCnf]].map(([label, val, setter], i) => (
              <div key={i} className="admin-form-field"><label>{label}</label><input type="password" value={val} onChange={e => { setter(e.target.value); setMsg(null); }} placeholder="••••••••••" onKeyDown={e => e.key === "Enter" && changePw()} /></div>
            ))}
            <button className="btn-green" style={{ padding: "11px 20px" }} onClick={changePw}>Alterar Senha</button>
          </div>
          <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--off-white)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Como aceder ao Admin</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.8, fontWeight: 300 }}>
              • Atalho: <strong>Ctrl + Shift + Alt + M</strong><br />
              • Ou: clique no logo no rodapé <strong>5×</strong><br />
              • Depois introduza a sua senha
            </div>
          </div>
        </div>

        <div className="form-section" style={{ marginBottom: 0 }}>
          <div className="form-section-title">🔐 Registo de Segurança</div>
          <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
            {securityLog.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-muted)", fontSize: 13, fontWeight: 300 }}>Nenhum registo ainda.</div>
            ) : (
              [...securityLog].reverse().map((entry, i) => (
                <div key={i} className={`sec-log-entry ${entry.success ? "sec-log-ok" : "sec-log-warn"}`}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{entry.success ? "✅" : entry.type === "failed" ? "❌" : "⚠️"}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12 }}>{entry.event}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{entry.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview ────────────────────────────────────────────────────────────────────
function AdminPreviewCatalog({ products, categories, clients, paymentSettings }) {
  const demo = clients.length > 0 ? clients[0] : { id: 0, businessName: "Cliente Exemplo", address: "Luanda", code: "MN-000", type: "Restaurante" };
  return (
    <div>
      <div className="admin-title">Pré-visualização</div>
      <div className="admin-sub">O que o cliente vê ao entrar na plataforma.</div>
      <div style={{ border: "3px solid var(--orange)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: "var(--orange)", padding: "8px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>👁️ A visualizar como: {demo.businessName}</span>
        </div>
        <BuyerCatalog products={products} categories={categories} currentUser={demo} paymentSettings={paymentSettings} onNewOrder={() => {}} goTo={() => {}} />
      </div>
    </div>
  );
}

// ── Admin App Shell ────────────────────────────────────────────────────────────
function AdminApp({ products, setProducts, orders, setOrders, clients, setClients, categories, setCategories, feedbacks, setFeedbacks, paymentSettings, setPaymentSettings, adminPassword, setAdminPassword, securityLog }) {
  const [tab, setTab] = useState("dashboard");
  const newFeedbacks = feedbacks.filter(f => f.status === "Novo").length;
  const pendingOrders = orders.filter(o => o.status === "Pending").length;

  const navItems = [
    { k: "dashboard",  i: "📊", l: "Dashboard" },
    { k: "clients",    i: "👥", l: "Clientes" },
    { k: "products",   i: "📦", l: "Produtos" },
    { k: "categories", i: "🗂️", l: "Categorias" },
    { k: "orders",     i: "🛒", l: `Encomendas${pendingOrders > 0 ? ` (${pendingOrders})` : ""}` },
    { k: "payment",    i: "💳", l: "Pagamentos" },
    { k: "feedbacks",  i: "💡", l: `Sugestões${newFeedbacks > 0 ? ` (${newFeedbacks})` : ""}` },
    { k: "security",   i: "🔒", l: "Segurança" },
    { k: "preview",    i: "👁️", l: "Ver como Cliente" },
  ];

  return (
    <div className="admin-wrap">
      <div className="admin-sidebar">
        <div style={{ padding: "12px 12px 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <Logo height={28} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#6ecb6e" }}>Admin</span>
        </div>
        <div className="admin-sidebar-label">Menu</div>
        {navItems.map(n => (
          <button key={n.k} className={`admin-nav-btn${tab === n.k ? " active" : ""}`} onClick={() => setTab(n.k)}>
            <span>{n.i}</span> {n.l}
          </button>
        ))}
      </div>
      <div className="admin-content">
        {tab === "dashboard"  && <AdminDashboard products={products} orders={orders} clients={clients} categories={categories} feedbacks={feedbacks} />}
        {tab === "clients"    && <AdminClients clients={clients} setClients={setClients} orders={orders} />}
        {tab === "products"   && <AdminProducts products={products} setProducts={setProducts} categories={categories} />}
        {tab === "categories" && <AdminCategories categories={categories} setCategories={setCategories} products={products} />}
        {tab === "orders"     && <AdminOrders orders={orders} setOrders={setOrders} clients={clients} />}
        {tab === "payment"    && <AdminPaymentGateway paymentSettings={paymentSettings} setPaymentSettings={setPaymentSettings} />}
        {tab === "feedbacks"  && <AdminFeedbacks feedbacks={feedbacks} setFeedbacks={setFeedbacks} />}
        {tab === "security"   && <AdminSecurity adminPassword={adminPassword} setAdminPassword={setAdminPassword} securityLog={securityLog} />}
        {tab === "preview"    && <AdminPreviewCatalog products={products} categories={categories} clients={clients} paymentSettings={paymentSettings} />}
      </div>
    </div>
  );
}

// =============================================================================
// 9. ROOT APP
// =============================================================================
export default function App() {
  // ── Data ──────────────────────────────────────────────────────────────────────
  const [products,        setProducts]        = useState(INITIAL_PRODUCTS);
  const [categories,      setCategories]      = useState(INITIAL_CATEGORIES);
  const [clients,         setClients]         = useState(INITIAL_CLIENTS);
  const [orders,          setOrders]          = useState(INITIAL_ORDERS);
  const [feedbacks,       setFeedbacks]       = useState(INITIAL_FEEDBACKS);
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [page,             setPage]             = useState("home");
  const [currentUser,      setCurrentUser]      = useState(null);
  const [showLogin,        setShowLogin]        = useState(false);
  const [isAdmin,          setIsAdmin]          = useState(false);
  const [adminPassword,    setAdminPassword]    = useState("Menamart@933929233Angola");
  const [adminPreview,     setAdminPreview]     = useState(null);
  const [showAdminModal,   setShowAdminModal]   = useState(false);
  const [adminPw,          setAdminPw]          = useState("");
  const [adminPwError,     setAdminPwError]     = useState(false);
  const [failedAttempts,   setFailedAttempts]   = useState(0);
  const [adminLocked,      setAdminLocked]      = useState(false);
  const [lockTimer,        setLockTimer]        = useState(0);
  const [toast,            setToast]            = useState(null);
  const [securityLog,      setSecurityLog]      = useState([]);
  const [footerClicks,     setFooterClicks]     = useState(0);
  const footerTimer = useRef(null);

  // ── Security: lockout timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!adminLocked) return;
    let t = 60;
    setLockTimer(t);
    const interval = setInterval(() => {
      t--;
      setLockTimer(t);
      if (t <= 0) { clearInterval(interval); setAdminLocked(false); setFailedAttempts(0); }
    }, 1000);
    return () => clearInterval(interval);
  }, [adminLocked]);

  // ── Security: keyboard shortcut ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key === "M") {
        e.preventDefault();
        addSecLog({ event: "Tentativa de acesso ao admin via atalho", type: "info", success: false });
        setShowAdminModal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addSecLog = entry => setSecurityLog(prev => [...prev.slice(-49), { ...entry, time: new Date().toLocaleString("pt-AO") }]);

  // ── Footer logo secret click ──────────────────────────────────────────────────
  const handleFooterLogoClick = () => {
    const next = footerClicks + 1;
    if (footerTimer.current) clearTimeout(footerTimer.current);
    if (next >= 5) {
      addSecLog({ event: "Tentativa de acesso ao admin via logo", type: "info", success: false });
      setShowAdminModal(true);
      setFooterClicks(0);
      return;
    }
    setFooterClicks(next);
    footerTimer.current = setTimeout(() => setFooterClicks(0), 2000);
  };

  // ── Admin login ───────────────────────────────────────────────────────────────
  const handleAdminLogin = () => {
    if (adminLocked) return;
    if (adminPw === adminPassword) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminPw("");
      setAdminPwError(false);
      setFailedAttempts(0);
      addSecLog({ event: "✅ Login de admin bem-sucedido", type: "ok", success: true });
      // WhatsApp alert to owner on successful admin login
      // (optional — open in background, owner receives message)
      // window.open(waLink(`🔒 *Menamart Admin*\nLogin efectuado com sucesso às ${new Date().toLocaleTimeString("pt-AO")}.`), "_blank");
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      setAdminPwError(true);
      addSecLog({ event: `❌ Tentativa de login falhada (${attempts}/${MAX_FAILED_ATTEMPTS})`, type: "failed", success: false });

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        setAdminLocked(true);
        setShowAdminModal(false);
        setAdminPw("");
        addSecLog({ event: `🚨 Admin bloqueado após ${attempts} tentativas falhadas`, type: "blocked", success: false });
        // Alert owner via WhatsApp about hacking attempt
        const alertMsg = `🚨 *ALERTA DE SEGURANÇA — Menamart*\n\nForam detectadas *${attempts} tentativas de login falhadas* no painel de administração!\n\nHora: ${new Date().toLocaleString("pt-AO")}\n\nSe não foi você, mude a senha imediatamente.`;
        window.open(waLink(alertMsg, WA_NUMBER), "_blank");
        setToast({ msg: `🚨 Admin bloqueado! ${attempts} tentativas falhadas. Notificação enviada.`, warn: true });
        setTimeout(() => setToast(null), 8000);
      }
    }
  };

  // ── New order handler ─────────────────────────────────────────────────────────
  const handleNewOrder = order => {
    setOrders(prev => [order, ...prev]);
    setToast({ msg: `🛒 Nova encomenda de ${order.clientName} · ${fmt(order.total)}` });
    setTimeout(() => setToast(null), 7000);
  };

  // ── Navigation ────────────────────────────────────────────────────────────────
  const goTo = pageKey => {
    if (pageKey === "login") { setShowLogin(true); return; }
    setShowLogin(false);
    setPage(pageKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogin  = user => { setCurrentUser(user); setShowLogin(false); setPage("catalog"); };
  const handleLogout = ()   => { setCurrentUser(null); setPage("home"); };

  // ── Render: Admin mode ────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <>
        <div className="page-bg" />
        <style>{STYLES}</style>
        <nav className="nav" style={{ background: "rgba(6,14,6,.97)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo height={34} />
            <BrandName />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, background: "rgba(232,88,10,.15)", color: "var(--orange-light)", border: "1px solid rgba(232,88,10,.25)", borderRadius: 6, padding: "3px 9px", letterSpacing: ".08em" }}>ADMIN</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["site", "👁️ Site"], ["sobre", "Sobre Nós"], ["contacto", "Contacto"]].map(([k, l]) => (
              <button key={k} onClick={() => setAdminPreview(adminPreview === k ? null : k)} style={{ padding: "7px 13px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, background: adminPreview === k ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.06)", color: adminPreview === k ? "#fff" : "rgba(255,255,255,.5)", transition: "all .18s" }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {toast && <span style={{ background: "var(--orange)", color: "#fff", borderRadius: 100, padding: "4px 12px", fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 700 }}>🔔 Nova</span>}
            <button onClick={() => { setIsAdmin(false); setAdminPreview(null); }} style={{ padding: "5px 11px", background: "rgba(220,38,38,.15)", color: "#f87171", border: "1px solid rgba(220,38,38,.3)", borderRadius: 7, fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all .18s" }}
              onMouseEnter={e => { e.target.style.background = "#DC2626"; e.target.style.color = "#fff"; }}
              onMouseLeave={e => { e.target.style.background = "rgba(220,38,38,.15)"; e.target.style.color = "#f87171"; }}
            >✕ Sair</button>
          </div>
        </nav>

        {adminPreview ? (
          <div>
            <div style={{ background: "var(--orange)", padding: "8px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 64, zIndex: 100 }}>
              <span style={{ color: "#fff", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>👁️ Pré-visualização</span>
              <button onClick={() => setAdminPreview(null)} style={{ marginLeft: "auto", background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 7, padding: "4px 14px", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✕ Fechar</button>
            </div>
            <div style={{ background: "var(--off-white)" }}>
              {adminPreview === "site" && <><NavBar page="catalog" goTo={() => {}} currentUser={clients[0] || { businessName: "Exemplo", address: "Luanda", code: "MN-000" }} cartCount={0} onCartOpen={() => {}} onLogout={() => {}} /><BuyerCatalog products={products} categories={categories} currentUser={clients[0] || { businessName: "Exemplo", address: "Luanda", code: "MN-000" }} paymentSettings={paymentSettings} onNewOrder={() => {}} goTo={() => {}} /></>}
              {adminPreview === "sobre" && <PageSobreNos goTo={() => {}} />}
              {adminPreview === "contacto" && <PageContacto goTo={() => {}} />}
            </div>
          </div>
        ) : (
          <AdminApp
            products={products}         setProducts={setProducts}
            orders={orders}             setOrders={setOrders}
            clients={clients}           setClients={setClients}
            categories={categories}     setCategories={setCategories}
            feedbacks={feedbacks}       setFeedbacks={setFeedbacks}
            paymentSettings={paymentSettings} setPaymentSettings={setPaymentSettings}
            adminPassword={adminPassword}     setAdminPassword={setAdminPassword}
            securityLog={securityLog}
          />
        )}

        {toast && (
          <div className={`toast${toast.warn ? " toast-warn" : ""}`}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>{toast.msg}</div>
            <button className="toast-close" onClick={() => setToast(null)}>✕</button>
          </div>
        )}
      </>
    );
  }

  // ── Render: Public/Client mode ────────────────────────────────────────────────
  const renderPage = () => {
    if (currentUser) {
      if (page === "account")  return (<><NavBar page={page} goTo={goTo} currentUser={currentUser} onCartOpen={() => {}} onLogout={handleLogout} /><div style={{ background: "var(--off-white)" }}><ClientAccount currentUser={currentUser} setCurrentUser={setCurrentUser} orders={orders} feedbacks={feedbacks} setFeedbacks={setFeedbacks} goTo={goTo} /></div><Footer goTo={goTo} onSecretClick={handleFooterLogoClick} /></>);
      if (page === "sobre")    return (<><NavBar page={page} goTo={goTo} currentUser={currentUser} onCartOpen={() => {}} onLogout={handleLogout} /><PageSobreNos goTo={goTo} /></>);
      if (page === "contacto") return (<><NavBar page={page} goTo={goTo} currentUser={currentUser} onCartOpen={() => {}} onLogout={handleLogout} /><PageContacto goTo={goTo} /></>);
      return (
        <>
          <NavBar page={page} goTo={goTo} currentUser={currentUser} cartCount={0} onCartOpen={() => {}} onLogout={handleLogout} />
          <BuyerCatalog products={products} categories={categories} currentUser={currentUser} paymentSettings={paymentSettings} onNewOrder={handleNewOrder} goTo={goTo} />
          <Footer goTo={goTo} onSecretClick={handleFooterLogoClick} />
        </>
      );
    }
    if (page === "sobre")    return (<><NavBar page={page} goTo={goTo} currentUser={null} onCartOpen={() => {}} onLogout={() => {}} /><PageSobreNos goTo={goTo} /></>);
    if (page === "contacto") return (<><NavBar page={page} goTo={goTo} currentUser={null} onCartOpen={() => {}} onLogout={() => {}} /><PageContacto goTo={goTo} /></>);
    return (<><NavBar page="home" goTo={goTo} currentUser={null} onCartOpen={() => {}} onLogout={() => {}} /><PublicLanding goTo={goTo} /></>);
  };

  return (
    <>
      <div className="page-bg" />
      <style>{STYLES}</style>

      {renderPage()}

      {/* Login modal */}
      {showLogin && <PageLogin goTo={goTo} clients={clients} onLogin={handleLogin} />}

      {/* Toast */}
      {toast && !isAdmin && (
        <div className={`toast${toast.warn ? " toast-warn" : ""}`}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13 }}>{toast.msg}</div>
          <button className="toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Admin lockout toast */}
      {adminLocked && (
        <div className="toast toast-warn" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", right: "auto", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontWeight: 900, fontSize: 16, marginBottom: 8 }}>🔒 Acesso Bloqueado</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, marginBottom: 4 }}>Aguarde {lockTimer} segundos</div>
          <div style={{ fontSize: 11, opacity: .75 }}>Notificação enviada ao administrador via WhatsApp</div>
        </div>
      )}

      {/* Admin modal */}
      {showAdminModal && !adminLocked && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAdminModal(false); setAdminPwError(false); setAdminPw(""); } }}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-head">
              <img src={LOGO_SRC} alt="Menamart" />
              <h2>Acesso Administrativo</h2>
              <p>Área restrita — equipa Menamart</p>
            </div>
            <div className="modal-body">
              {failedAttempts > 0 && (
                <div className="security-attempts">
                  🚨 <strong>{failedAttempts}/{MAX_FAILED_ATTEMPTS}</strong> tentativas falhadas.<br />
                  Após {MAX_FAILED_ATTEMPTS} tentativas, o acesso é bloqueado por 60 segundos e o administrador é notificado via WhatsApp.
                </div>
              )}
              {adminPwError && <div className="modal-error">❌ Senha incorrecta. Tente novamente.</div>}
              <div className="form-field">
                <label className="form-label">Senha de Administrador</label>
                <input className="form-input" type="password" value={adminPw} autoFocus onChange={e => { setAdminPw(e.target.value); setAdminPwError(false); }} placeholder="••••••••••••" onKeyDown={e => { if (e.key === "Enter") handleAdminLogin(); if (e.key === "Escape") { setShowAdminModal(false); setAdminPw(""); setAdminPwError(false); } }} />
              </div>
              <button className="modal-submit" onClick={handleAdminLogin}>Entrar →</button>
              <button className="modal-back" onClick={() => { setShowAdminModal(false); setAdminPw(""); setAdminPwError(false); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}