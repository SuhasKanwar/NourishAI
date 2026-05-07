# NourishAI

NourishAI is an autonomous AI system designed to manage daily food, grocery, and dining decisions. It integrates high-level reasoning through Large Language Models (LLMs) with real-world execution via the Model Context Protocol (MCP). The system evolves from a simple recommender to a proactive agent by learning user habits, optimizing for health and budget, and executing transactions directly through integrated services.

## System Architecture and Technicalities

The project is built on a multi-service architecture that separates concerns between the user interface, backend-for-frontend logic, and the core intelligence engine.

### Web Frontend and BFF
The frontend is a Next.js 15 application utilizing the App Router and React 19. It functions as a Backend-for-Frontend (BFF), managing session persistence via NextAuth.js and database interactions through Prisma ORM. 

Technical highlights of the frontend:
- Design System: Built with Tailwind CSS 4.0, focusing on a high-density, dark-themed dashboard.
- Motion Engine: Integrates Framer Motion, GSAP, and Lenis for fluid, state-aware transitions and micro-animations.
- Synchronization: Uses custom hooks to maintain a real-time link between the user's browser context (geolocation, local time) and the agent's reasoning engine.

### Agent Microservice
The intelligence layer is a FastAPI-based microservice that orchestrates the reasoning and tool execution.

Technical highlights of the microservice:
- LLM Orchestration: Built with LangChain, utilizing Groq as the inference provider for sub-second response times using Llama-3 models.
- Persistence: Uses PostgreSQL for long-term user data and FAISS for vector-based semantic memory of user preferences.
- Integration: Implements a custom Model Context Protocol (MCP) bridge to interact with Swiggy APIs for restaurant menus, Instamart groceries, and Dineout bookings.

---

## Technical Working Flow

The system operates through a sequential pipeline of specialized agents and services:

### 1. Contextual Data Collection
When a user provides a prompt, the system first triggers the Context Service. This service aggregates:
- Temporal Context: Current time and meal type (Breakfast, Lunch, Dinner, Snack).
- Environmental Context: Real-time weather data and geocoded location via OpenStreetMap.
- Financial Context: Active monthly budget limits and remaining balances retrieved from the database.

### 2. Multi-Agent Orchestration
The request and context are passed to the NourishAgentOrchestrator, which utilizes a multi-agent design pattern:
- The Planner Agent: Breaks down the user's intent into a series of search queries and tasks.
- The Tooling Layer: Executes asynchronous calls to Swiggy MCP tools. It handles fallback logic between specific dish searches (search_menu) and restaurant searches (search_restaurants).
- The Budget Agent: Intercepts raw results and filters them based on the user's remaining financial capacity.
- The Health Agent: Performs semantic ranking, prioritizing "Healthy Picks" based on nutritional keywords and vendor metadata.

### 3. Data Normalization and UI Patching
Because raw data from different services (Instamart vs. Restaurant Menu) varies in structure, a normalization engine standardizes them into a unified Recommendation schema. This schema includes computed fields for estimated time of arrival (ETA), standardized pricing, and image resolution logic.

The final response includes a "UI Patch"—a set of instructions that the frontend uses to update the dashboard state, including the Copilot reasoning text, new action queues, and updated budget visualizations.

### 4. Execution and OAuth Bridge
For actions that modify real-world state (like adding to a cart or placing an order), the system uses an OAuth 2.0 bridge. If the agent detects that an action requires authorization, it generates a state-aware redirect URL, allowing the user to connect their account securely. Once authenticated, the orchestrator can execute persistent actions like `update_food_cart` or `place_food_order` on behalf of the user.

---

## Technical Design Patterns

- Preference Memory: Implements a "Remember" pattern where successful recommendations are vectorized and stored in FAISS. Future reasoning cycles perform a similarity search to ensure recommendations align with historical user satisfaction.
- Pop-Bright Motion System: A custom animation pattern where the UI reacts to LLM updates by scaling elements and applying a brightness/glow filter, visually indicating "fresh" data from the AI engine.
- Fail-Safe Tooling: Every tool execution is wrapped in a dedicated error handler that provides "suggested" status actions even when a live API call fails, ensuring the system never reaches a dead-end state.

## Tech Stack

### Web Layer
- Framework: Next.js, React 19
- Persistence: Prisma ORM, PostgreSQL
- Authentication: NextAuth.js
- Styling: Tailwind CSS 4, Lucide Icons
- Animation: Framer Motion, GSAP, Lenis

### Intelligence Layer
- Runtime: Python 3.10+
- Framework: FastAPI, Uvicorn
- Reasoning: LangChain, Groq (Llama-3 models)
- Vector Memory: FAISS
- Schema Validation: Pydantic
