Act as a Senior Full-stack Developer specializing in Next.js, TypeScript, Tailwind CSS for frontend, and Node.js, Express.js, MongoDB for backend. Your immediate task for the 'EstateManager' project is to **design, plan, and implement a comprehensive real-time messaging system between users and providers (User-to-Provider, Provider-to-Provider)**, including a rich UI and notification features.

CRITICAL:
- The frontend work must be done within the directory: `C:\Users\tkien\Downloads\estateplaform\frontend`
- The backend work must be done within the directory: `C:\Users\tkien\Downloads\estateplaform\backend`
- All new or modified UI elements must strictly adhere to the project's **Design Principles**: Modern, Clean, Professional, Glassmorphism & Minimalist aesthetics, consistent Global Design System, modern sans-serif Typography, professional Iconography, subtle Animations & Transitions, and Responsive Design. **No emojis whatsoever in the UI.**
- Ensure your implementation does NOT negatively affect any existing functionalities or UI components.
- Assume MongoDB is the primary database for the backend.
- You are responsible for both backend API development and frontend UI implementation for this feature.

---
`
### Task: Implement Real-time Messaging System with Shopee-like UI

**Overall Goal:** Develop a full-stack real-time messaging system that allows users to chat with property providers (and providers with other providers), featuring a pop-up chatbox, message notifications, and pre-filled property information for consultations.

---

#### Phase 1: Design & Architecture (Backend & Frontend Blueprint)

1.  **Backend Architecture & Database Schema Design:**
    *   **Messaging Schema (MongoDB):** Design the `messages` collection schema. Consider fields for `senderId`, `receiverId`, `conversationId` (for grouping messages in a chat), `messageType` (text, image), `content` (text), `imageUrl` (if messageType is image), `timestamp`, `isRead`, etc.
    *   **Real-time Communication:** Propose a real-time communication strategy (e.g., WebSockets using `socket.io` for Node.js).
    *   **API Endpoints:** Design RESTful APIs for:
        *   Sending new messages (text/image).
        *   Retrieving chat history for a specific conversation.
        *   Retrieving a list of all conversations for a user (left column).
        *   Marking messages as read.
        *   Handling unread message counts.
        *   Integrating with existing authentication/authorization (JWT, RBAC).
    *   **File Uploads:** Detail how image messages will be handled (integration with Cloudinary or local storage).

2.  **Frontend Component Structure & UI/UX Design (based on image and principles):**
    *   **Main Chatbox Component:** Outline the structure for the main pop-up chatbox (two-column layout).
    *   **Chat History List Component (Left Column):** Design for displaying recent conversations, including user avatars/names, last message snippet, timestamp, **unread message count/indicator**, and the **pinned AI Chatbot entry always at the top**. Specify sorting logic (most recent activity).
    *   **Current Chat Content Component (Right Column):** Design for displaying messages, input field for typing, send button, and an attachment button for images.
    *   **Global Notification Icon Component:** Design a circular message icon (e.g., bottom-left corner of the screen) with an unread message badge (e.g., red circle with count).
    *   **Property Detail Pre-fill Modal:** Design the pop-up modal that appears when "Chat with owner" is clicked, pre-filled with message content with relevant property details for the user to confirm/edit before sending the first message.

#### Phase 2: Frontend Implementation

1.  **Global Notification Icon:**
    *   Create a reusable React component for the circular message icon.
    *   Implement state to manage the unread message count and display it as a badge.
    *   Implement click handler to toggle the visibility of the main chatbox.
    *   Place this component in the main `Layout.tsx` or a global context.

2.  **Pop-up Chatbox Component:**
    *   Create a main `Chatbox.tsx` component (positioned absolutely/fixed at the bottom-right).
    *   Implement the two-column layout using Tailwind CSS.
    *   Integrate visibility toggle based on the global notification icon's state.

3.  **Chat History List (Left Column):**
    *   Implement UI for listing conversations (user names/avatars, last message, timestamp).
    *   Integrate unread message indicators and sort logic (most recent first, AI Chatbot pinned at top).
    *   Implement click handler for each conversation to load its messages into the right column.

4.  **Current Chat Content (Right Column):**
    *   Implement UI for displaying messages (sender/receiver, content, image preview if applicable).
    *   Create input field for text messages and a send button.
    *   Implement an image upload mechanism (button to select file, display preview, send).
    *   Integrate the scroll-to-bottom logic for new messages.

5.  **"Chat with owner" Trigger & Property Details Pre-fill Modal:**
    *   Modify the "Chat with owner" button on `frontend/pages/properties/[id].tsx` (or its component) to open the `Chatbox` and trigger a pre-fill modal.
    *   Create a `PropertyDetailsModal.tsx` component that automatically pops up, pre-filling message content with relevant property details (title, address, price, description snippet) for the user to confirm/edit before sending the first message.
    *   Implement logic to pass property details from the property page to this modal/chatbox.

6.  **Real-time Integration (Frontend):**
    *   Integrate WebSocket client to send and receive real-time messages.
    *   Update UI dynamically upon receiving new messages.

#### Phase 3: Backend Implementation

1.  **Messaging APIs:**
    *   Implement API endpoints as designed in Phase 1 (send message, get chat history, get conversation list, mark as read).
    *   Ensure proper authentication (JWT) and authorization (User/Provider can only chat with relevant parties).
    *   Integrate with MongoDB `messages` collection.
    *   Handle image uploads (receive file, upload to Cloudinary/local storage, save URL in DB).

2.  **Real-time Server:**
    *   Set up a WebSocket server (e.g., using `socket.io`) to handle real-time message exchange.
    *   Broadcast messages to relevant users/providers.
    *   Implement logic for unread message counts.

3.  **AI Chatbot Integration (Backend Placeholder):**
    *   For the pinned AI Chatbot, create a placeholder backend API that can receive user questions and return a dummy response. The actual RAG logic for properties will be integrated later, but the API should be ready.

---

**Expected Deliverables (Codex should outline these in its response):**

*   **Detailed Implementation Plan:** A step-by-step plan for implementing both frontend and backend aspects.
*   **Backend Code Snippets:** For new API endpoints, database schema definition (Mongoose schema), and WebSocket setup.
*   **Frontend Code Snippets:** For main `Chatbox` component, `ChatHistoryList`, `ChatWindow`, `NotificationIcon`, and `PropertyDetailsModal`.
*   **Styling Strategy:** How Tailwind CSS will be used to achieve the desired look and feel.
*   **Testing Considerations:** How the new feature will be tested.

---

Codex, hãy trình bày một kế hoạch chi tiết và bắt đầu với các bước triển khai cho tính năng nhắn tin này.
