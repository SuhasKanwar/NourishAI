import asyncio
import httpx
import json

access_token = "eyJLSUQiOiI3a2w4OW0wbi0yb3BxLTVyNnMtOHQ5MS11MnYzNHd4NTZ5ejAiLCJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJvem9uZS1jeCIsInN1YiI6Ijg0NTkwNjcwIiwiZXhwIjoxNzc4MjUwOTM5LCJpYXQiOjE3Nzc4MTg5MzksInVzZXJfcG9vbCI6IlVTRVJfUE9PTF9JTlZBTElEIiwidGlkIjoiMTY0ZmFhNzgtNGU0Ni00OTkwLWE3ZjItMzU2MzA5MTU1YWU4IiwidG9rZW4iOiI4YzFjYWM1Mi0zNjJlLTQyOGEtOWJlZC1jMzliZjI1YzU2NTEyYWIzYjAzMi03YmI1LTRkYzItYTQ3OC03ZTc4NzRhZGQyNGEiLCJzZXNzaW9uX2lkIjoicjdZR3V2bjN4NzNRYVhhNVcwSExPZyIsInNpYXQiOjE3Nzc4MTg5Mzl9.kkDPklkSiIROVqkUgZKS-maLheQ7ow46RQUgw9Zild2QXsuiafwXYchnVNZXMYGqXW3qEg7ko2Wmj3ct9vn9ZnYEebHg3CgHijVlJ51_Ot70uYE37Ww-lrROiYbbwxNUo36O69niVzsE0yVtLli4cFiwV2YGrKRumkZFXR2zoYaXDtMcaf4XBE1pjfJyJ2KfbhDhsLnji3v5cIR43EZKHdgjiNUnekh17PAgNELcFUVXC98glJn_cRBOnO4_v-QSW0KrRuO5nuem_671nzZCFG3tC-fKJ0BeXRrgxhHuZoA8ptqPy7Qbr4fOwMChfo9ClCclwn6u1JxL3LYyaNOPJA"

async def main():
    async with httpx.AsyncClient() as client:
        r2 = await client.post("https://mcp.swiggy.com/food", json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "search_restaurants",
                "arguments": {"addressId": "301736076", "query": "thali biryani"}
            }
        }, headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        })
        print(json.dumps(r2.json()))

asyncio.run(main())
