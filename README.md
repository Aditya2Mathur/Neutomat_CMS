# Clinic ERP — Management System

A complete clinic workflow system with **Reception**, **Doctor**, **Pharmacy**, and **Admin** modules, powered by Google Sheets + Google Apps Script.

## 🚀 Quick Start

### 1. Google Sheets Setup

1. Create a new Google Sheet
2. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
3. Open **Extensions → Apps Script**
4. Paste the contents of `Code.gs` into the script editor
5. Replace `YOUR_SPREADSHEET_ID_HERE` with your actual spreadsheet ID
6. Run the `setupSheets()` function once — this creates all 7 required tabs with headers

### 2. Deploy as Web App

1. In Apps Script, click **Deploy → New deployment**
2. Select **Web app**
3. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy** and copy the URL
5. Authorize the permissions when prompted

### 3. Configure the App

1. Open `index.html` in a browser (or host it)
2. Log in as **admin** (username: `admin`, password: `admin123`)
3. Go to **Settings** → paste your Apps Script URL → Save

### 4. Start Using

Log in with one of the default accounts:

| Role | Username | Password |
|------|----------|----------|
| Reception | `reception` | `rec123` |
| Doctor (Neuro) | `neuro` | `neuro123` |
| Doctor (Gynec) | `gynec` | `gynec123` |
| Pharmacy | `pharmacy` | `pharm123` |
| Admin | `admin` | `admin123` |

---

## 📋 Workflow

```
Reception books appointment
    ↓
System assigns doctor by specialty
    ↓
Doctor sees patient in queue, starts consultation
    ↓
Doctor writes prescription (diagnosis + medicines + notes)
    ↓
Prescription sent to Pharmacy
    ↓
Pharmacy dispenses medicines, prints prescription
    ↓
Patient receives printed prescription & medicines
```

---

## 📊 Google Sheets Structure

| Tab | Purpose |
|-----|---------|
| **Appointments** | All bookings with patient info, specialty, status, doctor |
| **Patients** | Patient registry with phone as primary key |
| **Prescriptions** | Doctor prescriptions with diagnosis, medicines (JSON), notes |
| **Inventory** | Medicine stock with category, quantity, pricing |
| **DispenseLog** | Pharmacy dispense records |
| **Users** | System users with roles and specialties |
| **AuditLog** | System activity log |

---

## 🏥 Status Flow

```
Booked → Assigned → In Consultation → Prescription Completed → Sent to Pharmacy → Dispensed → Closed
```

---

## 🖥️ Pages

| Page | Roles | Description |
|------|-------|-------------|
| Dashboard | All | Stats, chart, recent activity |
| New Booking | Reception, Admin | Book appointments with patient info |
| Appointments | Reception, Admin | View/filter all appointments |
| Patient Queue | Doctor, Admin | View assigned patients, start consultation |
| Prescription Editor | Doctor | Write diagnosis, medicines, notes |
| Pharmacy Queue | Pharmacy, Admin | View pending/dispensed prescriptions |
| Inventory | Pharmacy, Admin | Manage medicine stock |
| Users | Admin | Manage system users |
| Settings | Admin | Configure clinic info and API URL |
| Search | All | Search patients across all records |
| Print View | All | Preview and print prescriptions |

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla, no frameworks)
- **Backend**: Google Apps Script
- **Database**: Google Sheets
- **Icons**: Phosphor Icons
- **Fonts**: Inter (Google Fonts)
- **Charts**: Chart.js

---

## 📱 Features

- ✅ Role-based access control (4 roles)
- ✅ Specialty-based doctor routing
- ✅ Returning patient auto-fill (phone lookup)
- ✅ 5-day free visit window
- ✅ Prescription editor with medicine table
- ✅ Pharmacy queue with dispense workflow
- ✅ Inventory management with low stock alerts
- ✅ Print-ready A4 prescription format
- ✅ WhatsApp prescription sharing
- ✅ Offline mode with sync queue
- ✅ Responsive design (desktop + tablet)
- ✅ Real-time clock in topbar

---

## 🔮 Future Enhancements

- [ ] PDF prescription download
- [ ] SMS appointment reminders
- [ ] Patient medical history timeline
- [ ] Billing and invoice generation
- [ ] Lab test integration
- [ ] Appointment scheduling calendar
- [ ] Multi-clinic support
- [ ] Role-based permissions granularity
- [ ] Medicine auto-suggest from inventory
- [ ] Analytics dashboard with revenue charts
