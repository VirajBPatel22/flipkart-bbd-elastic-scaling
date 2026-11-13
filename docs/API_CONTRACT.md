# Group 21 API Contract: Frontend Storefront & Backend API

**Project:** IT457 Cloud Computing — Flipkart Big Billion Days Elastic Scaling Demonstration  
**Parties:** Neel Prajapati (Frontend · 202611022) & Virajkumar Patel (Backend · 202611047)  
**Status:** Agreed and Implemented  

---

## 1. Architectural Scope

* The frontend never communicates directly with the Supabase database.
* All data is retrieved through the Node.js / Express backend API layer (`/api/*`).
* The backend binds to all network interfaces (`0.0.0.0`) and respects reverse proxies (ALB / Nginx Gateway).
* The frontend consumes `VITE_API_BASE_URL` (default `http://localhost:5000` locally, or gateway path `/api`).

---

## 2. Endpoints & Schemas

### 2.1 Service Liveness Check: `GET /api/health`

Polls service status to indicate whether the backend process is running. Used by the storefront header pill (`ApiStatus.jsx`) and container health checks.

* **Method:** `GET`
* **Path:** `/api/health`
* **Query Parameters:** None
* **Success Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "service": "backend-api",
    "timestamp": "2026-11-13T12:00:00.000Z"
  }
  ```

---

### 2.2 Database Readiness Check: `GET /api/ready`

Probes connectivity and execution against Supabase PostgreSQL.

* **Method:** `GET`
* **Path:** `/api/ready`
* **Success Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "database": "reachable"
  }
  ```
* **Failure Response (`503 Service Unavailable`):**
  ```json
  {
    "status": "unavailable",
    "database": "unavailable"
  }
  ```

---

### 2.3 Product Catalogue: `GET /api/products`

Retrieves active products from Supabase matching optional filter parameters.

* **Method:** `GET`
* **Path:** `/api/products`
* **Query Parameters:**
  * `category` *(optional, string)*: Filter by exact category name (case-sensitive or trimmed, max 100 characters).
  * `limit` *(optional, integer)*: Number of products to return (between 1 and 100, default `20`).

* **Success Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "e8a3b5c1-1234-4567-89ab-cdef01234567",
        "name": "Wireless Noise Cancelling Headphones",
        "description": "Premium over-ear headphones with active noise cancellation.",
        "price": 14999.00,
        "category": "Electronics",
        "image_url": "https://example.com/headphones.jpg",
        "stock_quantity": 42,
        "is_active": true,
        "created_at": "2026-11-12T10:00:00.000Z",
        "updated_at": "2026-11-12T10:00:00.000Z"
      }
    ],
    "meta": {
      "count": 1
    }
  }
  ```

* **Error Responses:**
  * **`400 Bad Request`**: Returned when `category` is empty string or exceeds 100 chars, or when `limit` is invalid.
    ```json
    {
      "status": "error",
      "message": "Invalid \"category\" query parameter. Expected a non-empty string of at most 100 characters."
    }
    ```
  * **`500 Internal Server Error`**: Database error or unexpected server failure.
    ```json
    {
      "status": "error",
      "message": "Internal server error"
    }
    ```

---

## 3. Client-Side Behaviors & Contracts

1. **Client-Side Search:** Search query filtering is performed client-side across the returned active catalogue to provide instantaneous, responsive typing feedback without thrashing backend database connections.
2. **URL State Synchronization:** Category selection and search queries are reflected in the URL query string (`?category=Electronics&q=phone`). The storefront listens to `popstate` to ensure native browser Back and Forward navigation works reliably.
3. **Resilience & Fallbacks:** If remote `image_url` fails to load (network drop or 404), the storefront falls back to bundled SVG/JPG illustrations categorized by product type (`electronics`, `fashion`, `grocery`, `books`, `beauty`, `sports`, `home`, `toys`).
4. **Retry Actions:** In the event of API connectivity issues (`Failed to fetch` or HTTP 500/503), the frontend renders an explicit error notice with an interactive **Retry** button that re-triggers the data fetch.
