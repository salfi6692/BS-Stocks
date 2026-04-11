/// <reference types="vite/client" />
import emailjs from '@emailjs/browser';
import { Order } from '../types';

// EmailJS Configuration (User needs to set these up in their EmailJS dashboard)
// Service ID, Template ID, and Public Key
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_default';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_order_notification';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export const sendOrderEmailNotification = async (order: any, orderId: string) => {
  if (!EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS Public Key is missing. Email notification skipped.');
    return;
  }

  const itemsList = order.items.map((item: any) => 
    `${item.title} (Qty: ${item.quantity}, Size: ${item.selectedSize}, Color: ${item.selectedColor}) - Rs ${item.price * item.quantity}`
  ).join('\n');

  const templateParams = {
    order_id: orderId,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    shipping_address: order.address,
    total_amount: order.totalAmount,
    items_list: itemsList,
    store_owner_email: 'bsstocks544@gmail.com'
  };

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    console.log('Order email notification sent successfully');
  } catch (error) {
    console.error('Failed to send order email notification:', error);
  }
};

export const generateWhatsAppMessage = (order: any, orderId: string) => {
  const itemsList = order.items.map((item: any) => 
    `• ${item.title} (Qty: ${item.quantity}, Size: ${item.selectedSize})`
  ).join('\n');

  const message = `*New Order Received!* 🛍️\n\n` +
    `*Order ID:* ${orderId}\n` +
    `*Customer:* ${order.customerName}\n` +
    `*Phone:* ${order.customerPhone}\n` +
    `*Address:* ${order.address}\n\n` +
    `*Items:*\n${itemsList}\n\n` +
    `*Total Amount:* Rs ${order.totalAmount}\n\n` +
    `Please confirm my order. Thank you!`;

  return encodeURIComponent(message);
};

export const getWhatsAppUrl = (order: any, orderId: string) => {
  const phone = '923394050544';
  const message = generateWhatsAppMessage(order, orderId);
  return `https://wa.me/${phone}?text=${message}`;
};
