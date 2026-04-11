/// <reference types="vite/client" />
import emailjs from '@emailjs/browser';
import { Order } from '../types';

// EmailJS Configuration (User needs to set these up in their EmailJS dashboard)
// Service ID, Template ID, and Public Key
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_default';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_order_notification';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export const sendOrderEmailNotification = async (order: any, orderId: string) => {
  console.log('Attempting to send email notification for order:', orderId);
  console.log('Service ID:', EMAILJS_SERVICE_ID ? 'Configured' : 'Missing');
  console.log('Template ID:', EMAILJS_TEMPLATE_ID ? 'Configured' : 'Missing');
  console.log('Public Key:', EMAILJS_PUBLIC_KEY ? 'Configured' : 'Missing');
  
  if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === '') {
    const msg = 'EmailJS Public Key is missing. Please ensure VITE_EMAILJS_PUBLIC_KEY is set in your Secrets panel.';
    console.warn(msg);
    return { success: false, error: msg };
  }

  if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'service_default') {
    const msg = 'EmailJS Service ID is missing or default. Please configure VITE_EMAILJS_SERVICE_ID.';
    console.warn(msg);
    return { success: false, error: msg };
  }

  const itemsList = order.items.map((item: any) => {
    const itemPrice = item.discountPrice || item.price;
    return `${item.title} (Qty: ${item.quantity}, Size: ${item.selectedSize}${item.selectedColor ? `, Color: ${item.selectedColor}` : ''}) - Rs ${itemPrice * item.quantity}`;
  }).join('\n');

  const itemsHtml = order.items.map((item: any) => {
    const itemPrice = item.discountPrice || item.price;
    return `<li><strong>${item.title}</strong> (Qty: ${item.quantity}, Size: ${item.selectedSize}) - Rs ${itemPrice * item.quantity}</li>`;
  }).join('');
  const itemsListHtml = `<ul>${itemsHtml}</ul>`;

  const storeOwnerEmail = 'bsstocks544@gmail.com';
  const orderDisplayId = order.orderNumber || orderId;

  // 1. Notification to Store Owner
  const ownerTemplateParams = {
    order_id: orderDisplayId,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    shipping_address: order.address,
    total_amount: order.totalAmount,
    shipping_cost: '0',
    tax_amount: '0',
    items_list: itemsList,
    items_list_html: itemsListHtml,
    // Provide multiple aliases
    to_email: storeOwnerEmail,
    email: storeOwnerEmail,
    user_email: storeOwnerEmail,
    recipient_email: storeOwnerEmail,
    subject: `New Order Received - #${orderDisplayId}`
  };

  // 2. Confirmation to Customer
  const customerTemplateParams = {
    order_id: orderDisplayId,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    shipping_address: order.address,
    total_amount: order.totalAmount,
    shipping_cost: '0',
    tax_amount: '0',
    items_list: itemsList,
    items_list_html: itemsListHtml,
    // Provide multiple aliases for the recipient email
    to_email: order.customerEmail,
    email: order.customerEmail,
    user_email: order.customerEmail,
    recipient_email: order.customerEmail,
    subject: `Order Confirmation - #${orderDisplayId}`,
    store_name: 'BS Stocks',
    store_contact: 'bsstocks544@gmail.com'
  };

  console.log('Sending owner notification to:', storeOwnerEmail);
  console.log('Sending customer confirmation to:', order.customerEmail);

  try {
    // Send to Store Owner
    const ownerResponse = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      ownerTemplateParams,
      EMAILJS_PUBLIC_KEY
    );
    console.log('Store owner notification sent successfully', ownerResponse);

    // Send to Customer (only if email is provided)
    if (order.customerEmail) {
      const customerResponse = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        customerTemplateParams,
        EMAILJS_PUBLIC_KEY
      );
      console.log('Customer confirmation sent successfully', customerResponse);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send order email notifications:', error);
    // Provide a more helpful error message if it's the recipient error
    let errorMsg = error?.text || error?.message || 'Unknown error';
    if (errorMsg.includes('recipients address is empty')) {
      errorMsg = 'EmailJS error: The recipient email variable in your template (e.g., {{to_email}}) is not matching what the app is sending, or is empty.';
    }
    return { success: false, error: errorMsg };
  }
};
