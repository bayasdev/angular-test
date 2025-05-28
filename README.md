# How to Try: Bayteq Angular Challenge

This document provides instructions on how to set up, run, and test the "Lista de Promociones" application.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: (Specify version, e.g., v18.x or later) - Download from [nodejs.org](https://nodejs.org/)
- **Angular CLI**: (Specify version, e.g., v19.x) - Install globally using npm:
  ```bash
  npm install -g @angular/cli@19
  ```
  _(Adjust version number as per the project's actual Angular version)_

## 2. Setup

1.  **Clone the Repository**:

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

    _(Replace `<repository-url>` and `<repository-directory>` with actual values)_

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

## 3. Running the Application

1.  **Start the Development Server**:
    ```bash
    ng serve -o
    ```
    This command will build the application and open it in your default web browser. The application typically runs on `http://localhost:4200/`.

## 4. Accessing the Application

- Open your web browser and navigate to `http://localhost:4200/`.
- You will be redirected to the login page.

## 5. Testing Scenarios & Credentials

The application uses a mock JSON server for backend data. The data for users and products is predefined.

**Base URL for API**: `https://my-json-server.typicode.com/AValleO/challenge-json-db`

### Available User Roles and Credentials:

You can use the following credentials to test different user roles:

- **Analyst (Analista de Mercado)**:

  - **Username**: `sadcat596`
  - **Password**: `snowboard`
  - **Alternative Analyst**:
    - **Username**: `orangezebra289`
    - **Password**: `fred`

- **Sales Manager (Gerente de Ventas)**:
  - **Username**: `sadbird972`
  - **Password**: `qwer`
  - **Alternative Sales Manager**:
    - **Username**: `brownostrich321`
    - **Password**: `mail`

_(Note: The `isSupported` flag in the `roles` data determines if a role can log in. "Contabilidad" (accounting) has `isSupported: false` and should not be able to log in)._

### Scenario 1: Analyst - Create and Submit a Promotion List

1.  Navigate to `http://localhost:4200/` and log in as an **Analyst** (e.g., `sadcat596` / `snowboard`).
2.  You should be redirected to the Analyst dashboard (`/analyst`).
3.  The "Crear Nueva Lista de Promociones" (or similar) section should be visible.
4.  **Add Products to the List**:
    - Use the "Producto" dropdown (app-select) to choose a product. Products are fetched from `ApiService.getProducts()`.
    - Enter "Cantidad" (quantity) and "Precio Promocional" (promotional price).
    - Observe input validations:
      - Quantity must be an integer and within `minPromotionQuantity` and `maxPromotionQuantity` of the selected product.
      - Promotional price must be greater than or equal to `minPromotionPrice` and less than `listPrice` of the selected product.
      - The same product cannot be added multiple times.
    - Click "Añadir Producto" (Add Product). The item should appear in the "Lista de Promociones Actual" table.
5.  Repeat step 4 to add multiple products.
6.  **Remove a Product** (Optional):
    - If the list status is "EDICION", you should be able to remove items from the list.
7.  **Submit the List for Approval**:
    - Once the list is ready and contains valid items, the "Enviar Lista de Promos" (Send Promo List) button should be enabled.
    - Click the button.
    - The `PromotionService` should change the list status to "APROBACION".
    - The list should be persisted to `localStorage`.
    - The UI for the current list should become read-only for the Analyst.
    - A notification/confirmation message might appear.

### Scenario 2: Sales Manager - Review and Take Action on a Promotion List

1.  **Log out** as the Analyst.
2.  Log in as a **Sales Manager** (e.g., `sadbird972` / `qwer`).
3.  You should be redirected to the Sales Manager dashboard (`/sales-manager`).
4.  The `PromotionService` will load the promotion list from `localStorage`.
5.  **Verify List Display**:
    - If a list with status "APROBACION" exists, it should be displayed. The items should be read-only initially.
    - If no list exists or the list is not in "APROBACION" status, a message like "No existen Promociones por revisar." should be shown.
6.  **Review Items and Take Action (Approve/Reject per item)**:
    - For each item in the list, there should be "Approve" and "Reject" controls (e.g., buttons).
    - Click "Reject" for at least one item. Its status should change to `rejected`.
    - Click "Approve" for other items. Their status should change to `approved`.
    - The `PromotionService` updates the item statuses in its state.

### Scenario 3: Sales Manager - Return List to Analyst for Edition

1.  Continuing from Scenario 2, ensure at least one item has been marked as `rejected`.
2.  The "ENVIAR A EDICION" (Send to Edition) button should become enabled.
3.  Click "ENVIAR A EDICION".
4.  The `PromotionService` should change the overall list status to "EDICION".
5.  The list (with updated item statuses) should be persisted to `localStorage`.
6.  The Sales Manager might see a confirmation, and the list might disappear from their immediate view or indicate it has been sent back.

### Scenario 4: Analyst - Edit and Resubmit Rejected/Modified List

1.  **Log out** as the Sales Manager.
2.  Log in again as the **Analyst** who originally submitted the list.
3.  The `PromotionService` loads the list (now in "EDICION" status) from `localStorage`.
4.  **Verify Editable Items**:
    - Items previously marked as `rejected` by the manager should now be editable by the Analyst.
    - Items previously marked as `approved` might be locked or still editable depending on implementation choices (the plan implies rejected items are editable).
    - The Analyst can adjust quantity/price for rejected/editable items or remove them.
5.  Make necessary corrections to the items that were rejected.
6.  **Resubmit the List**:
    - Once corrections are made, click "Enviar Lista de Promos" (or a similar resubmit button).
    - The `PromotionService` should change the list status back to "APROBACION".
    - The list is persisted to `localStorage`.
    - The UI becomes read-only again for the Analyst.

### Scenario 5: Sales Manager - Final Approval of the List

1.  **Log out** as the Analyst.
2.  Log in again as the **Sales Manager**.
3.  The system loads the resubmitted list (status "APROBACION").
4.  The Sales Manager reviews the changes. Assume all items are now satisfactory.
5.  The Sales Manager marks all items as `approved`.
6.  The "APROBAR LISTA DE PROMOS" (Approve Promo List) button should become enabled only when all items in the list have a status of `approved`.
7.  Click "APROBAR LISTA DE PROMOS".
8.  The `PromotionService` should:
    - Change the list status to "APROBADO".
    - Persist the final list to `localStorage`.
    - A success alert/message should be displayed (e.g., "Lista de promociones aprobada exitosamente.").
9.  The flow for this promotion list is now complete. The list might be cleared from the active view or shown as "APROBADO".

## 6. Additional Testing Points

- **Authentication and Authorization**:
  - Try accessing `/analyst` or `/sales-manager` routes directly without logging in. You should be redirected to `/login` by `AuthGuard`.
  - Log in as an Analyst and try to access `/sales-manager`. `RoleGuard` should prevent this.
  - Log in as a Sales Manager and try to access `/analyst`. `RoleGuard` should prevent this.
  - Attempt to log in with invalid credentials. An error message "Credenciales inválidas" should appear.
  - Attempt to log in with a user whose role has `isSupported: false` (e.g., create a temporary user or use the "accounting" role if a user existed for it). An error "Rol no soportado" should appear.
- **Logout Functionality**:
  - Ensure the "Salir" (Logout) button in the main layout clears user session data from `AuthService` and `localStorage`, then redirects to `/login`.
- **Responsiveness and UI**:
  - Check if the UI is reasonably responsive on different screen sizes.
  - Verify that shared components (`app-button`, `app-input`, `app-card`, etc.) are used consistently and display correctly.
- **Error Handling**:
  - Test edge cases in the promotion form (e.g., non-numeric input for quantity/price if not prevented by input type).
  - If the mock API were to fail (simulate by temporarily blocking the URL if possible), how does the application handle it? (Graceful error messages are ideal).
- **Data Persistence**:
  - Create a promotion list as an Analyst. Close the browser tab/window without submitting. Reopen and log in. The list should _not_ be there (as per "If page closed before sending, list is lost").
  - Submit a list as an Analyst. Close the browser. Reopen. Log in as Sales Manager. The list should be available for review.
  - Manager rejects items and sends to edition. Close browser. Reopen. Log in as Analyst. The list should be available for editing with rejected items.

This comprehensive testing plan should help verify the core functionalities of the Bayteq Angular Challenge application.
