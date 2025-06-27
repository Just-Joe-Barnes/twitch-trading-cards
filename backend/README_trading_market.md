# Twitch Trading Cards - Trading & Market System Documentation

---

## **Overview**

This document details the **refactored trading and market system**, including:

- Architecture and workflow
- Validation and security checks
- Real-time notifications
- Edge case handling
- Summary of changes

---

## **1. Summary of Changes**

- **Service Layer Refactor:**  
  - Moved core trade logic into `src/services/tradeService.js`  
  - Controllers now delegate to services, improving maintainability and testability

- **Strict Validation:**  
  - Added Joi validation to all trade and market endpoints  
  - Enforced enums and constraints in Mongoose schemas

- **Expiration Handling:**  
  - Added `expiresAt` timestamps to trades and offers  
  - Created `src/scripts/expireCleanup.js` to auto-cancel expired items

- **Audit Logging:**  
  - All critical actions logged to `logs/audit.log` via `src/helpers/auditLogger.js`

- **Rate Limiting:**  
  - Sensitive endpoints protected with `express-rate-limit` middleware

- **Real-Time Notifications:**  
  - Socket.IO notifications on trade and market events  
  - Users receive instant updates on offers, acceptances, rejections, cancellations

- **Code Cleanup:**  
  - Improved error handling, authorization checks, and concurrency control

---

## **2. Trading System Workflow**

### **Trade Creation**

- **Endpoint:** `POST /api/trades`
- **Validations:**
  - Sender ≠ recipient
  - Sender owns all offered cards
  - Recipient owns all requested cards
  - Sender has enough packs
  - Recipient has enough packs
  - No cards are `'pending'` in other trades/listings
  - At least one item or pack involved
- **Optional:** `counterOf` field can reference an existing trade ID when sending a counter offer. Cards pending solely because of that trade are allowed.
- **Process:**
  - Creates a `Trade` with status `'pending'`
  - Marks involved cards as `'pending'`
  - Notifies recipient in real-time and via stored notification
  - Logs audit entry

### **Trade Status Update**

- **Endpoint:** `PUT /api/trades/:id/status`
- **Validations:**
  - Only recipient can accept/reject
  - Only sender can cancel
  - Status must be `'accepted'`, `'rejected'`, or `'cancelled'`
  - Both users still have enough packs at acceptance
- **Process:**
  - If **accepted**:
    - Swaps packs accordingly
    - Transfers card ownership
    - Marks cards as `'available'`
    - Updates `acquiredAt` timestamp on transferred cards
    - Cancels other pending trades/listings involving these cards
    - Notifies both users
  - If **rejected/cancelled**:
    - Marks cards as `'available'`
    - Notifies relevant user
  - Logs audit entry

---

## **3. Market System Workflow**

### **Listing Creation**

- **Endpoint:** `POST /api/market/listings`
- **Validations:**
  - User owns the card
  - Card is not `'pending'`
  - No duplicate active listing for the same card
- **Process:**
  - Creates a `MarketListing` with status `'active'`
  - Marks card as `'pending'`
  - Notifies owner
  - Logs audit entry

### **Making an Offer**

- **Endpoint:** `POST /api/market/listings/:id/offers`
- **Validations:**
  - Cannot offer on own listing
  - Only one active offer per user per listing
- **Process:**
  - Adds offer to listing
  - Notifies listing owner
  - Logs audit entry

### **Accepting an Offer**

- **Endpoint:** `PUT /api/market/listings/:id/offers/:offerId/accept`
- **Validations:**
  - Only listing owner can accept
  - Buyer has enough packs
  - Seller still owns the card
- **Process:**
  - Transfers packs and card ownership
  - Marks card as `'available'`
  - Updates `acquiredAt` timestamp on transferred cards
  - Deletes listing
  - Cancels other listings for the same card
  - Notifies buyer and seller
  - Logs audit entry

---

## **4. Real-Time Notifications**

- **Socket.IO** emits events on:
  - Trade offers received
  - Trade accepted/rejected/cancelled
  - Market offers received
  - Market offers accepted
  - Listings created
- **Frontend** listens and updates UI instantly
- **Stored notifications** also created for persistence

---

## **5. Validation & Security**

- **Joi validation** on all inputs
- **Strict enums** in schemas
- **Authorization checks**:
  - Only relevant users can modify trades/offers/listings
- **Rate limiting** to prevent abuse
- **Audit logs** for traceability
- **Card status `'pending'`** prevents double-spending
- **Expiration cleanup** prevents stale data

---

## **6. Edge Case Handling**

- **Double-spending:**  
  Cards involved in trades or listings are marked `'pending'` to prevent concurrent offers/trades.

- **Insufficient packs:**  
  Checked both at creation and acceptance.

- **Unauthorized actions:**  
  Blocked with 403 errors.

- **Stale trades/offers:**  
  Auto-cancelled after expiration.

- **Conflicting trades/listings:**  
  Cancelled upon successful trade/offer acceptance.

---

## **7. Recommendations**

- Extend service layer to all controllers for consistency.
- Add automated tests for all endpoints.
- Implement user reputation and escrow for added trust.
- Consider explicit card locking with a dedicated collection or Redis.
- Add offer/trade expiration UI and management.
- Enhance notification UI with categories and filters.

---

## **8. Conclusion**

The refactored system is now:

- **Modular:** with clear separation of concerns
- **Robust:** with strong validation and concurrency control
- **Responsive:** with real-time updates
- **Secure:** with authorization and rate limiting
- **Maintainable:** ready for future enhancements

---

*Generated by Cline on 2025-04-05*
