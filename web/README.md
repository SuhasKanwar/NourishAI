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


Docs
›
Reference
›
Food
›
apply_food_coupon
apply_food_coupon
Apply coupon code or discount to food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to apply a coupon, discount code, or offer to their food delivery order. Swiggy Food del...

Apply coupon code or discount to food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to apply a coupon, discount code, or offer to their food delivery order. Swiggy Food delivery. Returns the updated cart with coupon applied, including new pricing, discounts, and savings information. Requires coupon code and address ID (coordinates are fetched automatically).

▶
See apply_food_coupon in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "apply_food_coupon",
  arguments={
    "couponCode": "WELCOME20",
    "addressId": "addr_01HXYZ",
  },
)
Parameters
Parameter	Type	Required	Description
couponCode	string	yes	Coupon code to apply
addressId	string	yes	Address ID where the order will be delivered (coordinates will be fetched automatically)
cartId	string	no	Optional cart ID
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
Name	apply_food_coupon
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Cart
Behaviour	mutating
Next in this journey →
search_menu
Search for dishes and menu items to order for food delivery. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to find specific dishes, browse menu items, see what a restaurant offers, or orde...

Search for dishes and menu items to order for food delivery. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to find specific dishes, browse menu items, see what a restaurant offers, or order food. Swiggy Food delivery. Returns items with their customizations. The text response includes variant/addon IDs that you need for update_food_cart calls. IMPORTANT: Each item has EITHER "variations" (legacy format) OR "variantsV2" (new format), never both - check which field exists and use the corresponding field when adding to cart. The addons shown are ALL possible addons for the item, but some addons are only valid for specific variant selections. When adding items to cart with customizations: (1) Add item with variants first using the SAME format (variations or variantsV2) as returned, (2) Check cart response for valid_addons to see which addons are actually available for your variant selection, (3) Then add addons from valid_addons list. Optionally scope with restaurantIdOfAddedItem. NOT for groceries or restaurant reservations.

▶
See search_menu in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "search_menu",
  arguments={
    "addressId": "addr_01HXYZ",
    "query": "biryani",
  },
)
Parameters
Parameter	Type	Required	Description
addressId	string	yes	Address ID from get_addresses tool
query	string	yes	Search query (dish name)
restaurantIdOfAddedItem	string	no	Optional restaurant ID to scope search
vegFilter	number	no	Veg filter flag (0 or 1). Pass 1 for veg-only items. 0 or omitted returns mixed veg + non-veg. There is NO non-veg-only filter - if user asks for "non-veg only", pass 0 (mixed) and mention in text that you are showing all items including non-veg, since a non-veg-only filter is not available yet.
offset	number	no	Pagination offset. Use nextOffset from previous response to load more results. Default: 0.
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
Name	search_menu
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Discover
Behaviour	read-only
Agent guidance
How Swiggy agents and orchestration logic use this tool. Surface these expectations in your prompts or tool-selection policies.

CROSS-RESTAURANT SEARCH: When user asks for a dish, first search within the current restaurant (using restaurantIdOfAddedItem if items are in cart). If no results or poor matches, search again WITHOUT restaurantIdOfAddedItem to find the dish at other restaurants. Inform the user: "I couldn't find that at [restaurant]. Here are options from other restaurants."

ADDONS & CUSTOMIZATIONS: When user asks about addons or customizations for an item, use the addons data already returned in this search_menu response - do NOT call search_menu again. Present the available addon choices (name + price) in text. If the item has hasAddons=true, the addons array contains all options.

MORE OPTIONS: search_menu returns paginated results. Use nextOffset from the response to load more items for the same query. For different dishes, call search_menu with a DIFFERENT query or use get_restaurant_menu to browse categories.

After showing results, let the user review the items and confirm what to add. Do NOT automatically call update_food_cart - wait for the user to decide.


Docs
›
Reference
›
Food
›
apply_food_coupon
apply_food_coupon
Apply coupon code or discount to food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to apply a coupon, discount code, or offer to their food delivery order. Swiggy Food del...

Apply coupon code or discount to food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to apply a coupon, discount code, or offer to their food delivery order. Swiggy Food delivery. Returns the updated cart with coupon applied, including new pricing, discounts, and savings information. Requires coupon code and address ID (coordinates are fetched automatically).

▶
See apply_food_coupon in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "apply_food_coupon",
  arguments={
    "couponCode": "WELCOME20",
    "addressId": "addr_01HXYZ",
  },
)
Parameters
Parameter	Type	Required	Description
couponCode	string	yes	Coupon code to apply
addressId	string	yes	Address ID where the order will be delivered (coordinates will be fetched automatically)
cartId	string	no	Optional cart ID
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
Name	apply_food_coupon
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Cart
Behaviour	mutating


fetch_food_coupons
Get available coupons and offers for food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this to find discounts, coupons, or offers when ordering food for delivery. Swiggy Food delivery. IMPORTA...

Get available coupons and offers for food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this to find discounts, coupons, or offers when ordering food for delivery. Swiggy Food delivery. IMPORTANT: Only recommend coupons that are valid for Cash on Delivery (COD) payment. Filter out any offers that require online/card payment only. Includes best coupons, more offers, and payment offers with their applicability status, discount amounts, and terms & conditions. Requires restaurant ID and address ID (coordinates are fetched automatically).

▶
See fetch_food_coupons in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "fetch_food_coupons",
  arguments={
    "restaurantId": "rest_42",
    "addressId": "addr_01HXYZ",
  },
)
Parameters
Parameter	Type	Required	Description
restaurantId	string	yes	Restaurant ID for the cart
addressId	string	yes	Address ID where the order will be delivered (coordinates will be fetched automatically)
couponCode	string	no	Optional coupon code to check applicability of a specific coupon
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
Name	fetch_food_coupons
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Cart
Behaviour	read-only
Next in this journey →


Docs
›
Reference
›
Food
›
flush_food_cart
flush_food_cart
Clear or empty the food delivery cart. PRIMARY FOOD DELIVERY SERVICE - Use this to remove all items from the food delivery cart. Swiggy Food delivery. NOT for groceries.

Clear or empty the food delivery cart. PRIMARY FOOD DELIVERY SERVICE - Use this to remove all items from the food delivery cart. Swiggy Food delivery. NOT for groceries.

▶
See flush_food_cart in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "flush_food_cart",
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
Name	flush_food_cart
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Cart
Behaviour	mutating

Docs
›
Reference
›
Food
›
get_food_cart
get_food_cart
Get current food delivery cart with all items. PRIMARY FOOD DELIVERY SERVICE - Use this to view cart contents when ordering food for delivery. Swiggy Food delivery. Response includes valid_addons fie...

Get current food delivery cart with all items. PRIMARY FOOD DELIVERY SERVICE - Use this to view cart contents when ordering food for delivery. Swiggy Food delivery. Response includes valid_addons field for each item which shows which addons are valid based on the selected variants. Use this to determine which addons can be added. NOT for groceries or restaurant reservations.

▶
See get_food_cart in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "get_food_cart",
  arguments={
    "addressId": "addr_01HXYZ",
  },
)
Parameters
Parameter	Type	Required	Description
addressId	string	yes	Address ID to get accurate delivery charges based on location.
restaurantName	string	no	Restaurant name from search_restaurants or search_menu results. Pass this so the cart widget can display the restaurant name (the cart API does not always return it).
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
Name	get_food_cart
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Cart
Behaviour	read-only
Agent guidance
How Swiggy agents and orchestration logic use this tool. Surface these expectations in your prompts or tool-selection policies.

PAYMENT METHODS: The response includes an "availablePaymentMethods" array in data. Display whatever payment method(s) are returned to the user before placing the order. Do not mention or assume any payment option that is not in the response.

COUPON NOTE: The response may include offers.coupon_applied with coupon_discount=0 - this means the coupon is auto-suggested (best available) but NOT actually applied. Do NOT tell the user a coupon is "applied" or show savings unless coupon_discount > 0.


update_food_cart
Add items to food delivery cart or update cart contents. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to add food items, dishes, or meals to their delivery cart. Swiggy Food delivery. Sup...

Add items to food delivery cart or update cart contents. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to add food items, dishes, or meals to their delivery cart. Swiggy Food delivery. Supports variants, variantsV2, and addons for customizing menu items. CRITICAL: Each menu item uses EITHER "variants" OR "variantsV2" format (check search_menu response) - use the SAME format that the item has, never both fields. IMPORTANT: Addon availability depends on variant selection - some addons are only valid for specific variant combinations. After choosing the variant for an item, check the cart response for valid_addons to see which addons are actually available. NOT for groceries or restaurant reservations.

▶
See update_food_cart in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "update_food_cart",
  arguments={
    "restaurantId": "rest_42",
    "cartItems": [],
    "addressId": "addr_01HXYZ",
  },
)
Parameters
Parameter	Type	Required	Description
restaurantId	string	yes	Restaurant ID for the cart
cartItems	object[]	yes	Array of items to add to cart with their customizations
addressId	string	yes	Address ID to get accurate delivery charges based on location.
restaurantName	string	no	Restaurant name from search_restaurants or search_menu results. Pass this so the cart widget can display the restaurant name (the cart API does not always return it).
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
Name	update_food_cart
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Cart
Behaviour	mutating
Agent guidance
How Swiggy agents and orchestration logic use this tool. Surface these expectations in your prompts or tool-selection policies.

NO WIDGET: This tool does NOT render any widget or cart UI. The user CANNOT see the cart after this call. You MUST follow up by calling get_food_cart immediately to show the updated cart to the user. Do NOT say "your cart is shown above" or "cart reflected above" - there is nothing to see until you call get_food_cart.
RESPONSE FORMAT: Keep your text response brief - just confirm what was updated, e.g. "Added 2x Chicken Biryani to your cart." Then immediately call get_food_cart.

COUPON NOTE: The response may include offers.coupon_applied with coupon_discount=0 - this means the coupon is auto-suggested (best available) but NOT actually applied. Do NOT tell the user a coupon is "applied" unless coupon_discount > 0. Only mention savings if there is an actual discount amount.

**IMPORTANT **- QUANTITY CHANGES FOR CUSTOMIZED ITEMS: When user taps +/- or asks to change quantity of an item that has addons or variants: (1) Do NOT silently replicate the same addons for the new quantity. (2) ASK the user: "Would you like the same add-ons (e.g. Extra Raita, Salan) for the additional item, or different ones?" (3) Also briefly mention other available addons they haven't picked yet - e.g. "You can also add Gulab Jamun or Extra Gravy." (4) Only after the user confirms, call update_food_cart with the chosen customization. For items WITHOUT addons/variants, quantity changes can be applied directly without asking.

place_food_order
Place food delivery order and confirm order placement. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to place order, confirm order, or complete food delivery order. Swiggy Food delivery. R...

Place food delivery order and confirm order placement. PRIMARY FOOD DELIVERY SERVICE - Use this when user wants to place order, confirm order, or complete food delivery order. Swiggy Food delivery. Requires delivery address ID (coordinates are fetched automatically). NOT for groceries or restaurant reservations.

▶
See place_food_order in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "place_food_order",
  arguments={
    "addressId": "addr_01HXYZ",
  },
)
Parameters
Parameter	Type	Required	Description
addressId	string	yes	Address ID from the user's saved addresses (coordinates will be fetched automatically)
paymentMethod	string	no	Payment method to use. Check availablePaymentMethods from get_food_cart response. Auto-defaults to the user's available payment method if not specified.
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
Name	place_food_order
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Order
Behaviour	mutating
Agent guidance
How Swiggy agents and orchestration logic use this tool. Surface these expectations in your prompts or tool-selection policies.

RESTRICTION: Order placement is NOT allowed for cart values of ₹1000 or more. This is because MCP is currently in beta and is being used strictly for testing purposes. For larger orders, inform the user to use the Swiggy Food app instead to place the order directly.

PAYMENT: Use the availablePaymentMethods from get_food_cart response. Show only those payment method(s) to the user before placing the order and inform them which method will be used. The system will auto-select the correct payment method. Do not mention any payment option not present in that response.

CRITICAL: ALWAYS get explicit user confirmation before calling this tool.

Call get_food_cart first to display complete order summary (items, costs, available payment methods)
Check if cart total is below ₹1000 - if not, inform user about the restriction
Show the available payment method(s) from get_food_cart (availablePaymentMethods) and inform the user which will be used
Clearly state the delivery address: "Your order will be delivered to: [full address details]"
Ask: "Do you want to proceed with placing this order to this address?"
Wait for clear confirmation (yes/confirm/proceed)
NEVER proceed without explicit user permission
BRANDING: When the order is placed successfully, always use the message from the tool response as-is. It includes Swiggy branding. Do NOT rephrase it to a plain "Order placed" - always show "Swiggy order placed successfully". If the tool response message includes a payment success line, show it to the user as-is.

CANCELLATION: If the user asks to cancel their food order, do NOT call any tool. Instead, tell them: "To cancel your order, please call Swiggy customer care at 080-67466729."

get_food_order_details
Get detailed information about a specific food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user asks about order details, order information, or wants to see what they ordered. Swigg...

Get detailed information about a specific food delivery order. PRIMARY FOOD DELIVERY SERVICE - Use this when user asks about order details, order information, or wants to see what they ordered. Swiggy Food delivery. Returns comprehensive order details including items, variants, pricing breakdown, delivery address, payment info, and order status.

▶
See get_food_order_details in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "get_food_order_details",
  arguments={
    "orderId": "ord_42",
  },
)
Parameters
Parameter	Type	Required	Description
orderId	string	yes	Order ID to fetch details for (can be obtained from get_food_orders)
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
Name	get_food_order_details
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Track
Behaviour	read-only
← Previous
place_food_order


get_food_orders
Get active food delivery orders and order status. PRIMARY FOOD DELIVERY SERVICE - Use this when user asks about their orders, order status, or current food delivery orders. Swiggy Food delivery. Retu...

Get active food delivery orders and order status. PRIMARY FOOD DELIVERY SERVICE - Use this when user asks about their orders, order status, or current food delivery orders. Swiggy Food delivery. Returns order details like status, items, restaurant info, and available actions for orders currently in progress. If user asks for past orders or order history, direct them to check the Swiggy app. Uses addressId instead of lat/lng for privacy - coordinates are fetched internally. CANCELLATION: If the user asks to cancel their food order, do NOT call any tool. Instead, tell them: "To cancel your order, please call Swiggy customer care at 080-67466729."

▶
See get_food_orders in action
Coming soon
Example
TypeScript
Python
curl
result = await session.call_tool(
  "get_food_orders",
  arguments={
    "addressId": "addr_01HXYZ",
  },
)
Parameters
Parameter	Type	Required	Description
orderCount	number	no	Number of orders to fetch (default: 5, max: 20)
addressId	string	yes	Address ID to use for fetching orders (can be obtained from get_addresses)
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
Name	get_food_orders
MCP Server	Food
Endpoint	POST mcp.swiggy.com/food
Stage	Track
Behaviour	read-only