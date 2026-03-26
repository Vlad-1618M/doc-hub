## Doc Hub — API reference

Human-readable summary of HTTP routes and the dashboard WebSocket. **Machine-readable contract:** **`GET /openapi.json`** (OpenAPI 3). **Interactive docs:** **`/docs`** (Swagger UI) or **`/redoc`**.

### On this page

1. [Base URL](#base-url)
2. [OpenAPI schema](#openapi-schema)
3. [Authentication](#authentication)
4. [Record collections](#record-collections)
5. [Dashboard](#dashboard)
6. [API root](#api-root)
7. [Resume CRUD](#resume-crud)
8. [WebSocket](#websocket)
9. [Additional notes](#additional-notes)

---

## Base URL

Use the `BASE_URL` environment variable in scripts and tests.

| Context | Example |
|---------|---------|
| API on host | [http://127.0.0.1:8000](http://127.0.0.1:8000) |
| API in Docker Compose | [http://doc-hub-api:8000](http://doc-hub-api:8000) |

---

## OpenAPI schema

| Resource | Path | Purpose |
|----------|------|---------|
| **OpenAPI JSON** | `GET /openapi.json` | Full **OpenAPI 3** document (paths, schemas, security). Use for codegen, Postman import, contract tests, CI drift checks. |
| **Swagger UI** | `GET /docs` | Browser UI backed by the same schema. |
| **ReDoc** | `GET /redoc` | Alternate docs UI. |

**Examples** (API on host port 8000):

```bash
curl -s http://127.0.0.1:8000/openapi.json | head -c 400
```

Behind **Doc Portal** nginx or Vite dev proxy, the same paths are served at the UI origin (e.g. `http://localhost:3000/openapi.json` in production compose, `http://localhost:5173/openapi.json` in Vite dev) because `/openapi.json` is proxied to FastAPI.

**Activity / audit:** `GET /audit/events` must also be proxied (`/audit` → API). If it is missing, the UI receives HTML from the SPA shell and the dashboard Activity column stays empty. See [build/nginx-ui.conf](/build/nginx-ui.conf) and [ui/vite.config.ts](/ui/vite.config.ts).

Metadata (title, version, tag descriptions) is set in [server.py](/src/server.py) on the `FastAPI(...)` constructor.

---

## Authentication

Source: [auth_endpoints.py](/src/auth/auth_endpoints.py). All routes use prefix **`/auth`**.

| Method | Path | Summary |
|--------|------|---------|
| `POST` | `/auth/register` | Create account; returns JWT + user |
| `POST` | `/auth/login` | Sign in; returns JWT + user |
| `POST` | `/auth/generate-api-key` | New API key. If `ADMIN_SECRET` is set on the server, send header **`X-Admin-Secret`** or a valid **`Authorization: Bearer`** JWT |
| `GET` | `/auth/api-keys` | List keys (+ metadata); requires **JWT or `X-API-Key`** |
| `GET` | `/auth/me` | Current user / key owner info; requires **JWT or `X-API-Key`** |
| `DELETE` | `/auth/revoke-api-key` | Query: key to revoke; requires **JWT or `X-API-Key`** |
| `DELETE` | `/auth/users/{user_id}` | Delete user and keys; **`X-Admin-Secret`** or JWT for that user |

User documents live in MongoDB database **`resume_auth`**, collection **`users`**. API keys are stored in **`resume_db.api_keys`**.

---

## Record collections

Source: [records_endpoints.py](/src/routes/records_endpoints.py). Each collection uses the **same CRUD shape**; only the path prefix and JSON schema differ.

| Prefix | MongoDB collection | Pydantic model |
|--------|-------------------|----------------|
| `/ubuntu-releases` | `ubuntu_releases` | `UbuntuRelease` |
| `/python-releases` | `python_releases` | `PythonRelease` |
| `/roman-leaders` | `roman_leaders` | `RomanLeader` |

| Method | Path pattern | Auth |
|--------|--------------|------|
| `GET` | `/{prefix}/` | Paginated list; optional query `q` (search) |
| `GET` | `/{prefix}/{id}` | Get by MongoDB `ObjectId` |
| `POST` | `/{prefix}/` | Create document |
| `PUT` | `/{prefix}/{id}` | Replace document |
| `DELETE` | `/{prefix}/{id}` | Delete document |

All of the above require **`X-API-Key`** or **`Authorization: Bearer`** (see `validate_api_key_or_jwt`).

Field definitions: [record_models.py](/src/models/record_models.py).

---

## Dashboard

Source: [dashboard_endpoints.py](/src/routes/dashboard_endpoints.py).

| Method | Path | Summary |
|--------|------|---------|
| `GET` | `/dashboard/stats` | Counts: `resumes`, `ubuntu_releases`, `python_releases`, `roman_leaders`, `api_keys` |

Requires **`X-API-Key`** or **Bearer JWT**.

---

## API root

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/` | Welcome JSON (e.g. `{"message": "Welcome to the Doc Hub API"}`) |

---

## Resume CRUD

Source: [crud_endpoints.py](/src/routes/crud_endpoints.py).

### 1. Health Check

- **Endpoint:** `GET /resume/status/health`
- **Summary:** Health check endpoint to verify the API is running.
- **Response:**
  - **200 OK**:  
    ```json
    {"status": "healthy"}
    ```
- **Docstring:**  
  *"Health check endpoint: --> returns: API status:"*

---

### 2. Create Resume

- **Endpoint:** `POST /resume/`
- **Summary:** Create a new resume.
- **Request Body:**  
  A complete `FullResume` object containing all required resume details.
- **Behavior:**
  - Converts the model to a dictionary using `model_dump()`.
  - Adds a `"created_at"` timestamp using the current UTC time.
  - Inserts the document into MongoDB.
- **Response:**
  - **200 OK**:  
    ```json
    {"message": "Resume created successfully", "id": "<resume_id>"}
    ```
- **Docstring:**  
  *"Insert a new resume data into MongoDB:
    - full_resume: --> FullResume object containing resume details:
    - returns:     --> Created resume message with ID:"*

---

### 3. Retrieve Resumes (Paginated)

- **Endpoint:** `GET /resume/`
- **Summary:** Retrieve a paginated list of resume summaries.
- **Query Parameters:**
  - `skip` (int, default: 0): Number of records to skip.
  - `limit` (int, default: 10, maximum: 100): Number of records to return.
- **Behavior:**  
  - Returns key fields from each resume (e.g., `_id`, `resume.name`, `resume.job_title.position`, `created_at`, `updated_at`, etc.).
  - `created_at` and `updated_at` are included for sorting/filtering recently changed records.
  - If no resumes exist, returns a 404 error.
- **Response:**
  - **200 OK**: List of resume summary objects.
  - **404 Not Found**: If no resumes are found.
- **Docstring:**  
  *"MongoDB pagination data retrieval:"*

---

### 4. Retrieve Resume by ID

- **Endpoint:** `GET /resume/{resume_id}`
- **Summary:** Retrieve full resume details by its unique ID.
- **Path Parameter:**  
  - `resume_id` (str): Unique identifier of the resume.
- **Behavior:**  
  - Converts the provided `resume_id` into a MongoDB `ObjectId`.
  - Returns the full resume object, converting the `_id` to a string.
  - Returns appropriate errors if the ID is invalid or not found.
- **Response:**
  - **200 OK**: Full resume details.
  - **400 Bad Request**: If `resume_id` is invalid.
  - **404 Not Found**: If no resume exists with the given ID.
- **Docstring:**  
  *"Retrieve a single resume by its ID."*

---

### 5. Update Resume (General PUT)

- **Endpoint:** `PUT /resume/`
- **Summary:** Update a single resume using a complete `FullResume` object.
- **Request Body:**  
  A complete `FullResume` object.
- **Behavior:**  
  - Uses an empty filter (`{}`) to update the first found resume in the collection.
  - (Note: This endpoint is generally for testing or single-resume scenarios.)
- **Response:**
  - **200 OK**:  
    ```json
    {"message": "Resume updated successfully:"}
    ```
  - **404 Not Found**: If no resume exists.
- **Docstring:**  
  *"Update a single resume:
    - full_resume:  --> Entire FullResume object:
    - returns:      --> Success message:
                    --> This endpoint uses update_one with an empty filter, updating the first found resume:"*

---

### 6. Bulk Update Resumes

- **Endpoint:** `PUT /resume/bulk`
- **Summary:** Update multiple resumes based on name filters.
- **Query Parameters:**
  - `first_name` (optional): Filter by first name.
  - `last_name` (optional): Filter by last name.
- **Request Body:**  
  A complete `FullResume` object.
- **Behavior:**  
  - At least one filter must be provided; otherwise, a 400 error is returned.
  - Updates all resumes matching the provided regex filter(s).
- **Response:**
  - **200 OK**:  
    ```json
    {"message": "Bulk update successful: Matched <n> and Modified <m> resumes:"}
    ```
- **Docstring:**  
  *"Bulk update resume details:
    - full_resume:  --> The FullResume object with fields to update:
    - first_name:   --> Optional filter on resume.name.first_name:
    - last_name:    --> Optional filter on resume.name.last_name:
                    --> At least one filter must be provided to avoid updating all documents:"*

---

### 7. Update Specific Resume by ID (Targeted PUT)

- **Endpoint:** `PUT /resume/{resume_id}`
- **Summary:** Update a specific resume identified by its unique ID.
- **Path Parameter:**  
  - `resume_id` (str): Unique identifier of the resume.
- **Request Body:**  
  A complete `FullResume` object.
- **Behavior:**  
  - Converts `resume_id` to an `ObjectId`.
  - Updates only the resume with the matching ID.
  - Adds an `"updated_at"` timestamp to the document.
  - Broadcasts a refresh event to connected WebSocket dashboard clients.
- **Response:**
  - **200 OK**:  
    ```json
    {"message": "Resume updated successfully:"}
    ```
  - **404 Not Found**: If no resume exists with the given ID.
- **Docstring:**  
  *"Update a specific resume:
    - resume_id:  --> Unique identifier for the resume:
    - full_resume: --> Entire FullResume object:
    - returns:     --> Success message:"*

---

### 8. Partial Update Resume by ID (PATCH)

- **Endpoint:** `PATCH /resume/{resume_id}`
- **Summary:** Partially update a resume by its ID.
- **Path Parameter:**  
  - `resume_id` (str): Unique identifier of the resume.
- **Request Body:**  
  A partial update object based on `FullResumeUpdate`.
- **Behavior:**  
  - Filters out any fields that are `None` from the provided update object.
  - Updates only those fields in the targeted resume.
  - Adds an `"updated_at"` timestamp to the document.
  - Broadcasts a refresh event to connected WebSocket dashboard clients.
- **Response:**
  - **200 OK**:  
    ```json
    {"message": "Resume with ID <resume_id> partially updated successfully."}
    ```
  - **400 Bad Request**: If `resume_id` is invalid.
  - **404 Not Found**: If no resume exists with the given ID.
- **Docstring:**  
  *"Partially update resume details by ID:
    - resume_id:    --> Unique identifier for the resume:
    - updated_data: --> Partial FullResumeUpdate object with fields to update:
    - returns:      --> Success message:"*

---

### 9. Partial Update Resume by Name (PATCH)

- **Endpoint:** `PATCH /resume/by_name/{first_name}_{last_name}`
- **Summary:** Partially update a resume based on first and last name.
- **Path Parameters:**
  - `first_name` (str): The resume’s first name.
  - `last_name` (str): The resume’s last name.
- **Request Body:**  
  A partial update object based on `FullResumeUpdate`.
- **Behavior:**  
  - Uses regex filters to match the provided first and last names.
  - Updates the first matching resume.
- **Response:**
  - **200 OK**:  
    ```json
    {"message": "Resume with ID '<resume_id>' updated successfully."}
    ```
  - **404 Not Found**: If no resume matches the provided names.
- **Docstring:**  
  *"Partially update resume details by name:
    - first_name:    --> First name of the resume to update:
    - last_name:     --> Last name of the resume to update:
    - updated_data:  --> Partial FullResumeUpdate object with fields to update:
    - returns:       --> Success message:"*

---

### 10. Delete Resume

- **Endpoint:** `DELETE /resume/{resume_id}`
- **Summary:** Delete a resume by its ID.
- **Path Parameter:**  
  - `resume_id` (str): Unique identifier of the resume.
- **Behavior:**  
  - Converts the provided `resume_id` to an `ObjectId`.
  - Deletes the matching resume document.
- **Response:**
  - **200 OK**:  
    ```json
    {"message": "Resume deleted successfully"}
    ```
  - **400 Bad Request**: If `resume_id` is invalid.
  - **404 Not Found**: If no resume exists with the given ID.
- **Docstring:**  
  *"Delete a specific resume by ID:"*

---

---

## WebSocket

**Deep dive:** [websocket_realtime_readme.md](websocket_realtime_readme.md) — architecture, proxies, `VITE_API_URL`, multi-worker limits, debugging, improvements.

### Dashboard Real-Time Updates

- **Endpoint:** `WS /ws/dashboard`
- **Summary:** WebSocket for real-time dashboard refresh notifications.
- **Behavior:**
  - Clients connect to receive push notifications when data changes.
  - No authentication required for the WebSocket connection.
  - Server broadcasts a JSON message when resumes, records (ubuntu-releases, python-releases, roman-leaders), or API keys are created, updated, or deleted.
- **Message format (broadcast):** JSON text with `event` (usually `"refresh"`) and `collection`, for example:
  - `{"event": "refresh", "collection": "resumes"}` — resume CRUD
  - `{"event": "refresh", "collection": "api_keys"}` — key created/revoked
  - `{"event": "refresh", "collection": "ubuntu_releases"}` (or `python_releases`, `roman_leaders`) — record CRUD
- **Use Case:** The Dashboard UI subscribes to this WebSocket to refetch data when another user or tab modifies records, providing a live-updating overview without manual refresh.

---

## Additional Notes

- **Model Conversion:**  
  Endpoints use Pydantic’s `model_dump()` method to convert models to dictionaries before inserting or updating in MongoDB.

- **Authentication:**  
  Protected routes use **`validate_api_key_or_jwt`**: send **`X-API-Key`** *or* **`Authorization: Bearer`** with a JWT. Register/login are unauthenticated; **`/auth/generate-api-key`** may require **`X-Admin-Secret`** when `ADMIN_SECRET` is configured.

- **Logging:**  
  Each endpoint includes logging calls for monitoring actions and diagnosing issues.

- **Timestamps:**  
  - Resumes include `created_at` on create and `updated_at` on PUT/PATCH. Records (ubuntu-releases, python-releases, roman-leaders) include `created_at` on create and `updated_at` on PUT.
- **Endpoint Variants:**  
  - **PUT (general)** updates the first found resume (using an empty filter) and is primarily for testing or single-record scenarios.
  - **PUT (targeted)** and **PATCH** endpoints update a specific resume by ID, ensuring that the correct record is modified.
  - **Bulk PUT** allows updating multiple resumes based on first and last name filters.

---

- NOTE: _This documentation is subject to `updates` as `API evolve`: <br>
  For the latest behavior and implementation details: refer to the [source](/src/) code_:

---
