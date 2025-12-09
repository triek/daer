# **daeR - Daily Reading Tracker**

**daeR** is a lightweight reading tracker for logging daily pages, maintaining streaks, and estimating your finish time based on real reading pace.

## **Features**

* Add and manage books with total pages & target daily pace
* Log pages read each day
* Automatic reading streak tracking
* Progress stats: pages read, pages left, pace, on-track status
* Estimated finish date based on your actual reading speed
* Simple REST API + minimal frontend UI for testing

## **API Endpoints**

### **Books**

* `GET /books`
* `GET /books/:id`
* `POST /books`
* `PATCH /books/:id`
* `DELETE /books/:id`

### **Daily Logs**

* `GET /books/:id/logs`
* `POST /books/:id/logs`

### **Progress**

* `GET /books/:id/progress`
* `GET /books/:id/streak`

---

## **Run Backend**

```bash
node server.js
```

## **Run Frontend (Vue + Vite)**

```bash
npm install
npm run dev
```

## **Project Structure**

```
server.js        # REST API
frontend/        # Vue app for CRUD + logging tests
README.md
```

