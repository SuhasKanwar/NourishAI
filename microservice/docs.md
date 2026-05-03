Docs
›
Reference
›
Food
Food
Swiggy Food MCP Server - Your AI-powered food delivery assistant. Discover restaurants, explore menus, customize your order with variants and add-ons, apply coupons for great discounts, and get delic...

Swiggy Food MCP Server - Your AI-powered food delivery assistant. Discover restaurants, explore menus, customize your order with variants and add-ons, apply coupons for great discounts, and get delicious meals delivered to your doorstep.

Endpoint: POST mcp.swiggy.com/food
Tools available: 14
Tools by stage
Discover
Tool	Description
get_addresses	Swiggy (Instamart/Food): Get all saved delivery addresses for the authenticated Swiggy user, sorted by last order date. This tool works for...
get_restaurant_menu	Get the complete menu of a restaurant, paginated by category. Use this to BROWSE a restaurant menu and see what is available. This is the P...
search_menu	Search for dishes and menu items to order for food delivery. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to find specific dish...
search_restaurants	Search and order food from restaurants for delivery. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to order food, get food deliv...
Cart
Tool	Description
apply_food_coupon	Apply coupon code or discount to food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to apply a coupon, discount ...
fetch_food_coupons	Get available coupons and offers for food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this to find discounts, coupons, or offers wh...
flush_food_cart	Clear or empty the food delivery cart. PRIMARY FOOD DELIVERY SERVICE - Use this to remove all items from the food delivery cart. Swiggy Foo...
get_food_cart	Get current food delivery cart with all items. PRIMARY FOOD DELIVERY SERVICE - Use this to view cart contents when ordering food for delive...
update_food_cart	Add items to food delivery cart or update cart contents. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to add food items, dishes...
Order
Tool	Description
place_food_order	Place food delivery order and confirm order placement. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to place order, confirm ord...
Track
Tool	Description
get_food_order_details	Get detailed information about a specific food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user asks about order details,...
get_food_orders	Get active food delivery orders and order status. PRIMARY FOOD DELIVERY SERVICE - Use this when user asks about their orders, order status,...
track_food_order	Track food delivery order status and delivery progress. PRIMARY FOOD DELIVERY SERVICE - Use this when user asks to track order, check deliv...
Support
Tool	Description
report_error	Generate an error report to share with the Swiggy MCP team. Use this when the user encounters an error and wants to report it. Returns a pr...

Docs
›
Reference
›
Food
›
get_addresses
get_addresses
Swiggy (Instamart/Food): Get all saved delivery addresses for the authenticated Swiggy user, sorted by last order date. This tool works for Swiggy Instamart and Food services. Addresses are returned ...

Swiggy (Instamart/Food): Get all saved delivery addresses for the authenticated Swiggy user, sorted by last order date. This tool works for Swiggy Instamart and Food services. Addresses are returned WITHOUT coordinates (latitude/longitude) for privacy protection. No parameters needed - authentication is handled automatically.

▶
See get_addresses in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "get_addresses",
  arguments={},
)
Parameters
Parameter	Type	Required	Description
Session credentials (user identity, access token) are supplied automatically by the authenticated MCP session - you do not pass them in the tool call. See Authenticate.

Response
All Swiggy MCP tools return:

{
  "success": true,
  "data": { /* tool-specific payload */ },
  "message": "optional human-readable message"
}
On failure:

{
  "success": false,
  "error": { "message": "description of what went wrong" }
}
See Error codes for the full catalogue.

Details
Field	Value
Name	get_addresses
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Discover
Behaviour	read-only
Agent guidance
How Swiggy agents and orchestration logic use this tool. Surface these expectations in your prompts or tool-selection policies.

**IMPORTANT **- STOP here and let the user choose:

Show the address list to the user
Ask: "Which address would you like to use for delivery?"
Do NOT call any other tool until the user has selected an address
Remember the selected addressId for all subsequent operations
If no addresses are returned, inform the user that they need to add an address first

Docs
›
Reference
›
Instamart
Instamart
Swiggy Instamart MCP Server - Your AI-powered grocery and essentials shopping assistant. Get everything from fresh fruits, vegetables, dairy, and staples to snacks, beverages, ...

Swiggy Instamart MCP Server - Your AI-powered grocery and essentials shopping assistant. Get everything from fresh fruits, vegetables, dairy, and staples to snacks, beverages, personal care, electronics, baby care, pet supplies, and more. Browse a wide variety of products across 50+ categories, enjoy great deals, manage your cart, and place orders with quick delivery right to your doorstep.

Endpoint: POST mcp.swiggy.com/im
Tools available: 13
Tools by stage
Discover
Tool	Description
create_address	Swiggy (Instamart/Food): Create a new delivery address for the authenticated user.
delete_address	Swiggy (Instamart/Food): Delete a saved delivery address for the authenticated user.
get_addresses	Swiggy (Instamart/Food): Get all saved delivery addresses for the authenticated Swiggy user, sorted by last order date. This tool works for...
search_products	Search for products available at the selected address. Returns products with their variants (e.g., different pack sizes, quantities). When ...
your_go_to_items	Fetch the user's Your Go To Items (frequently or recently ordered items) for the selected delivery address. Use addressId from get_addresse...
Cart
Tool	Description
clear_cart	Clear (remove all items from) the Instamart cart. Authentication is handled automatically.
get_cart	Swiggy Instamart (Grocery): Get current Swiggy Instamart grocery cart with all items and bill breakdown. Use this for Instamart grocery ord...
update_cart	Swiggy Instamart (Grocery): Update Swiggy Instamart grocery cart with items. Replaces entire cart with the provided items. Use this for Ins...
Order
Tool	Description
checkout	Swiggy Instamart (Grocery): Place and confirm Swiggy Instamart grocery order. Creates order and confirms payment in a single operation. Use...
Track
Tool	Description
get_order_details	Get detailed information for a specific Swiggy Instamart order by order ID. Use this when the user wants to see complete details about a sp...
get_orders	Swiggy Instamart order history - Use this to fetch ORDER HISTORY, past orders, or order preferences. Use this FIRST when user asks: "show m...
track_order	Track Swiggy Instamart order status in real-time. PRIMARY TOOL for order tracking - Use this FIRST when user asks: "where is my order", "tr...
Support
Tool	Description
report_error	Generate an error report to share with the Swiggy MCP team. Use this when the user encounters an error and wants to report it. Returns a pr...


Docs
›
Reference
›
Dineout
Dineout
Swiggy Dineout MCP Server - Your AI-powered restaurant discovery and table booking assistant. Find the best restaurants near you, explore exclusive deals and offers, check real-time availability, and...

Swiggy Dineout MCP Server - Your AI-powered restaurant discovery and table booking assistant. Find the best restaurants near you, explore exclusive deals and offers, check real-time availability, and book tables instantly - all for free.

Endpoint: POST mcp.swiggy.com/dineout
Tools available: 8
Tools by stage
Find
Tool	Description
get_restaurant_details	Swiggy Dineout: Get details about a specific restaurant for TABLE BOOKING. Returns ratings, deals, timings, address. Use restaurant ID from...
get_saved_locations	Swiggy Dineout: Get user's saved addresses for restaurant search. Returns address IDs that can be passed to search_restaurants_dineout.
search_restaurants_dineout	Swiggy Dineout: Search restaurants for TABLE BOOKING/RESERVATIONS. Use when user wants to GO OUT and book a table. NOT for food delivery. R...
Reserve
Tool	Description
book_table	Swiggy Dineout (Reservations): Book a table at a restaurant for a specific time slot. Only supports FREE reservations (isFree=true, booking...
create_cart	Swiggy Dineout: Create a cart for TABLE BOOKING or bill payment. For booking (DEAL_TICKET_PURCHASE): requires restaurant ID, slot details, ...
get_available_slots	Swiggy Dineout (Reservations): Check available time slots for TABLE BOOKING at a restaurant. Returns slots across up to 7 days from the req...
Manage
Tool	Description
get_booking_status	Get booking status and details for a dineout order. Returns restaurant name, date, time, guests, deal title, and status. Example: "What is ...
Support
Tool	Description
report_error	Generate an error report to share with the Swiggy MCP team. Use this when the user encounters an error and wants to report it. Returns a pr...
