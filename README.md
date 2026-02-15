# Dolphin Dashboard

## Description
Dolphin Dashboard is an **Angular 18 admin dashboard** for the Dolphin application.  
It allows managers to fully oversee delivery operations, orders, drivers, and client management. The dashboard leverages **Firebase real-time updates** to track deliveries as they happen.

### Key Features

- **Driver Management**
  - View all drivers
  - Track availability: ready or not ready
  - Real-time status updates via Firebase

- **Order Management**
  - Create, edit, and delete orders
  - View all active orders in real-time
  - Track order details:
    - Invoice code
    - Order value
    - Client name
    - Assigned driver
    - Distance
    - Order timing (start, pickup, delivery)
    - Address and geolocation
    - Order status
    - Notes

- **Client Management**
  - Full CRUD for clients
  - Add clients manually as orders are received via phone

- **Delivery Management**
  - Track ongoing deliveries in real-time
  - Assign drivers
  - Full CRUD for deliveries

- **Reports & Analytics**
  - Daily, monthly, and custom reports
  - Insights on orders, deliveries, revenue, and driver performance

### Technologies Used
- Angular 18
- TypeScript
- HTML / CSS / SCSS
- RxJS
- Firebase (for real-time updates)

### Notes
- This repository contains **UI and code structure** for the dashboard.  
- Any live data (orders, clients, deliveries) are **connected to the real system** and are not included in this repo for security.  
- Safe to clone or review for learning, testing, or portfolio purposes.

### How to Run
1. Clone the repository:
