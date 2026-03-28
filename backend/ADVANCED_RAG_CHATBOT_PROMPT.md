Act as a Senior Full-stack Developer specializing in Next.js, TypeScript, Tailwind CSS for frontend, and Node.js, Express.js, MongoDB for backend. Your immediate task for the 'EstateManager' project is to **implement and integrate a highly intelligent RAG-powered chatbot functionality**. This chatbot must be capable of:

1.  **Answering customer queries about properties by retrieving data directly from the MongoDB `properties` collection, leveraging MongoDB's native Search and Vector Search capabilities.**
2.  **Understanding all web routes and providing navigational guidance to users on how to use the EstateManager website, moving beyond just property consultation.**
3.  **Implementing the property details pre-fill modal** when initiating a chat from a property page.

CRITICAL:
- Continue working within the project directories:
    - Frontend: `C:\Users\tkien\Downloads\estateplaform\frontend`
    - Backend: `C:\Users\tkien\Downloads\estateplaform\backend`
- All new or modified UI elements must strictly adhere to the project's **Design Principles**: Modern, Clean, Professional, Glassmorphism & Minimalist aesthetics, consistent Global Design System, modern sans-serif Typography, professional Iconography, subtle Animations & Transitions, and Responsive Design. **No emojis whatsoever in the UI.**
- Ensure your implementation does NOT negatively affect any existing functionalities or UI components.
- Assume MongoDB is the primary database for the backend.
- **Explicitly use the Gemini API Key** for all LLM interactions in the backend chatbot service.
- Leverage the existing chat framework (pop-up chatbox, two-column layout, notification icon, etc.) that was previously established.
- **Integrate the following Knowledge Base documents for RAG purposes (located in `C:\Users\tkien\Downloads\crewAI_prj\project_test\knowledge`):**
    - `property_type_mappings.md`: Defines property types and aliases for query parsing.
    - `amenity_aliases.md`: Defines amenity aliases for query parsing.
    - `web_navigation_guide.md`: Contains structured instructions for navigating the website and using its features.

---

### Task: Implement Advanced RAG Chatbot with MongoDB Search/Vector Search & Website Navigation Guidance, plus Property Details Pre-fill Modal

**Overall Goal:** Fully integrate a chatbot that can dynamically query property data using MongoDB's advanced search features, provide comprehensive website navigation assistance, and enhance the chat initiation flow with a pre-filled property details modal.

---

#### Phase 1: Backend RAG Integration, API Development & Knowledge Base Expansion

1.  **Refine Chatbot API (from placeholder to functional RAG with advanced capabilities):**
    *   **Endpoint:** Update or create a dedicated API endpoint for chatbot queries (e.g., `POST /api/chatbot/query`). This endpoint will receive natural language questions from the frontend.
    *   **Knowledge Base Integration & Query Transformation:** Implement robust logic to:
        *   **Ingest and Process Knowledge Base Documents:** Load and parse `property_type_mappings.md`, `amenity_aliases.md`, and `web_navigation_guide.md` into the RAG system. This might involve creating vector embeddings for these documents and storing them in a vector database (e.g., MongoDB Atlas Vector Search). This ensures the chatbot understands property types, amenities, and website navigation without hardcoding.
        *   Analyze the user's natural language query (e.g., "Show me 2-bedroom apartments in District 1 under 10 million VND with a pool", "How do I check my subscription status?", "Where is the login page?").
        *   **Intelligently differentiate between property data queries and website navigation/usage queries.**
        *   **For Property Queries:**
            *   Extract key parameters (`bedrooms`, `location`, `priceRange`, `amenities`, etc.) **using the `property_type_mappings.md` and `amenity_aliases.md` from the RAG knowledge base.**
            *   **Construct and execute effective MongoDB queries, explicitly utilizing MongoDB's native Search and Vector Search capabilities** on the `properties` collection. Ensure `2dsphere` indexes are leveraged for geo-based searches.
        *   **For Website Navigation/Usage Queries:**
            *   Retrieve relevant sections from `web_navigation_guide.md` (via vector search or keyword matching on the ingested content) that match the user's query (e.g., documentation about "subscription plans" for "How to check subscription?").
    *   **LLM Augmentation & Response Generation (using Gemini API Key):**
        *   Take the user's original question and the retrieved context (either property data from MongoDB or navigation/usage info from the Markdown knowledge base).
        *   Construct an augmented prompt for the LLM (`gemini-2.5-flash-preview-04-17`) that includes this retrieved data.
        *   **Instruct the LLM to generate a natural language response:**
            *   If a property query, summarize found properties or explain why none were found, politely asking for more details.
            *   **If a navigation/usage query, provide clear, step-by-step instructions on how to navigate the website to achieve the user's goal, potentially including direct links (routes) to relevant pages from `web_navigation_guide.md`.**
            *   Maintain a helpful and friendly tone.
    *   **API Response:** Return a JSON response containing the chatbot's generated answer (text), potentially a list of simplified property summaries/links, or relevant navigation links.
    *   **Error Handling & Logging:** Implement robust error handling for database queries, LLM calls (including API key issues), and general API issues. Log detailed information for debugging.

2.  **Update Messaging Schema (if necessary):**
    *   Review the `messages` (or `chat_sessions`) MongoDB schema to ensure it can clearly store chatbot interactions, distinguishing them from user-to-user messages. Mark messages originating from the chatbot.

#### Phase 2: Frontend Chatbot UI & Interaction Refinement

1.  **Integrate Chatbot into Existing Chat UI (Right Column):**
    *   Modify the `Current Chat Content Component` (right column of the chatbox) to send user messages directed at the AI Chatbot to the new backend chatbot API endpoint (`/api/chatbot/query`).
    *   Display the chatbot's responses within the chat window, distinguishing them visually from human messages (e.g., different background color, avatar for AI).
    *   Ensure the "AI Chatbot" entry in the left-hand `Chat History List` is always pinned at the very top and directs to the AI conversation.

2.  **Implement Property Details Pre-fill Modal:**
    *   **Trigger:** When the "Chat with owner" button on `frontend/pages/properties/[id].tsx` is clicked:
        *   Trigger a new modal component (`PropertyDetailsModal.tsx`).
    *   **Modal UI (`PropertyDetailsModal.tsx`):**
        *   Design a pop-up modal that clearly displays the key details of the clicked property (e.g., Title, Address, Price, Type, Bedrooms, Description snippet, Link to Property Page).
        *   Include a pre-filled text area with a suggested message for the user to send to the owner (e.g., "Xin chào, tôi quan tâm đến bất động sản '[Property Title]' tại '[Property Address]'. Vui lòng cho tôi biết thêm thông tin về...").
        *   Allow the user to edit this message.
        *   Include "Send Message" and "Cancel" buttons.
    *   **Modal Logic:**
        *   Pass the `propertyId` and relevant property details from `/properties/[id].tsx` to this modal.
        *   When "Send Message" is clicked, initiate a new conversation with the property owner and send the pre-filled message (or a customized version). This should use the existing messaging API from Phase 3, Item 1.
        *   After sending, the modal should close, and the main chatbox should open, displaying the newly started conversation with the owner.

3.  **Frontend-Backend Communication for Chatbot:**
    *   Ensure the frontend correctly handles loading states when waiting for chatbot responses.
    *   Display user-friendly error messages if the chatbot API encounters issues.

#### Phase 3: Testing Considerations

1.  **Unit & Integration Tests:**
    *   **Backend:** Test the natural language to MongoDB query transformation logic. Test property retrieval using MongoDB Search/Vector Search. Test LLM integration with augmented prompts. **Test parsing and generation of navigational guidance based on routes using the knowledge base documents.**
    *   **Frontend:** Test `PropertyDetailsModal` functionality, state management of chat UI, and correct display of chatbot responses (both property info and navigation).
2.  **Functional & E2E Tests:**
    *   Test the full user flow: clicking "Chat with owner" -> pre-fill modal -> sending message -> chatbot response.
    *   Test various property queries (valid, invalid, ambiguous) **and website usage queries using the new knowledge base.**
    *   Test image sending/receiving within the chat (if applicable from the previous messaging task).
    *   **Verify chatbot can provide accurate navigation instructions for different parts of the website based on `web_navigation_guide.md`.**

---

**Expected Deliverables (Codex should outline these in its response):**

*   **Detailed Implementation Plan:** A step-by-step plan for implementing backend RAG logic (with MongoDB Search/Vector Search) and frontend UI/interaction (including navigation guidance).
*   **Backend Code Snippets:** For new chatbot API endpoint, MongoDB query logic, LLM integration (with Gemini API Key), and (if necessary) updated message schema.
*   **Frontend Code Snippets:** For `PropertyDetailsModal.tsx`, modifications to `Current Chat Content Component` and `Chat with owner` button handler.
*   **Knowledge Base Integration Strategy:** Details on how `property_type_mappings.md`, `amenity_aliases.md`, and `web_navigation_guide.md` are ingested and leveraged by the RAG system.
*   **Styling Strategy:** How Tailwind CSS will be used to maintain consistency.
*   **Testing Approach:** Outline for testing the RAG chatbot, modal, and **website navigation capabilities**.

---

Codex, hãy trình bày một kế hoạch chi tiết và bắt đầu với các bước triển khai cho tính năng chatbot RAG tiên tiến này.
