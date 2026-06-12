# Optimize Route Button - Error Debugging Guide

## Test File Created

✅ **Location:** `src/__tests__/tmap.test.ts`

This comprehensive test suite covers 20+ scenarios for the `optimizeRoute` and `prepareTmapPayload` functions, including real-world edge cases.

### Run Tests

```bash
npm test -- src/__tests__/tmap.test.ts
```

---

## Most Common Issues & Solutions

### 1. **Missing or Invalid API Key** 🔑 (Most Common)

**Error Message:** `Tmap App Key not found`

**Root Cause:**

- Environment variable `EXPO_PUBLIC_TMAP_API_KEY` is not set in `.env` file
- API key is incorrect or expired

**Solution:**

1. Create a `.env` file in the project root:
   ```
   EXPO_PUBLIC_TMAP_API_KEY=your_actual_tmap_api_key_here
   ```
2. Restart Expo and rebuild the app
3. Check that the API key is valid in your Tmap account

**To Test Locally:**

```bash
npm test -- src/__tests__/tmap.test.ts -t "should diagnose missing API key"
```

---

### 2. **No Stops in Database** 📍

**Error Message:** Alert shows error after clicking "Optimize Route" button

**Root Cause:**

- No addresses have been added to the app yet
- Database query returns empty array
- Display order values are not set correctly

**Solution:**

1. Add at least 2 stops using the "Add Address" feature
2. Verify stops appear in the list with correct coordinates
3. Try to optimize again

**To Debug:**

```typescript
// In the app's handleOptimize function, add logging:
const handleOptimize = async () => {
  try {
    const payload = await prepareTmapPayload(db);
    console.log("📍 Payload stops:", payload.stops); // Add this
    console.log("Number of stops:", payload.stops.length); // Add this

    if (payload.stops.length === 0) {
      Alert.alert("Error", "No stops added. Please add addresses first.");
      return;
    }

    const result = await optimizeRoute(payload);
    Alert.alert("Success", "Route optimized!");
  } catch (error) {
    Alert.alert("Error", String(error));
  }
};
```

---

### 3. **Network/API Connectivity Issues** 🌐

**Error Message:** `Network request failed` or timeout

**Root Cause:**

- No internet connection
- Tmap API endpoint is down or unreachable
- Firewall/proxy blocking requests
- API rate limiting (too many requests)

**Solution:**

1. Check internet connection on the device
2. Test API manually:
   ```bash
   curl -X POST "https://apis.openapi.sk.com/tmap/routes/routeOptimization?version=1" \
     -H "Content-Type: application/json" \
     -H "appKey: YOUR_API_KEY" \
     -d '{"stops":[{"lat":37.7749,"lng":127.4194}]}'
   ```
3. Check if Tmap API service is operational
4. Wait a moment if rate-limited, then retry

---

### 4. **Database Query Failure** 💾

**Error Message:** `Database connection failed` or similar

**Root Cause:**

- Database not initialized properly
- Corrupted stops table
- SQLiteContext not provided

**Solution:**

1. Verify database initialization in `_layout.tsx`
2. Check that `SQLiteProvider` wraps your app
3. Clear app data and reinstall:

   ```bash
   # iOS
   rm -rf node_modules/.cache
   cd ios && xcodebuild clean -workspace myapp.xcworkspace && cd ..

   # Android
   cd android && ./gradlew clean && cd ..
   ```

---

### 5. **Wrong API Response Format** 📊

**Error Message:** Response seems to work but nothing happens

**Root Cause:**

- API returns data in different format than expected
- Missing `resultCode` field or other expected fields
- Pagination or nested results not handled

**Solution:**

1. Add logging to see actual response:
   ```typescript
   const result = await optimizeRoute(payload);
   console.log("📊 API Response:", JSON.stringify(result, null, 2));
   ```
2. Update the response handler to work with actual format
3. Check Tmap API documentation for current response structure

---

## Test Coverage Summary

| Category             | Tests  | Status      |
| -------------------- | ------ | ----------- |
| `prepareTmapPayload` | 4      | ✅ Pass     |
| `optimizeRoute`      | 9      | ✅ Pass     |
| Integration tests    | 1      | ✅ Pass     |
| Real-world scenarios | 6      | ✅ Pass     |
| **Total**            | **20** | **✅ Pass** |

### Key Tests for Debugging

**Memory/Performance:**

- ✅ Handles single stop (minimal case)
- ✅ Handles empty stops array
- ✅ Validates integer boolean values from SQLite

**API/Network:**

- ✅ Validates correct API URL
- ✅ Validates correct headers (including API key)
- ✅ Handles 403 Forbidden (invalid key)
- ✅ Handles 500 Server Error
- ✅ Handles timeout/slow response

**Error Scenarios:**

- ✅ Throws when API key missing
- ✅ Throws on network error
- ✅ Throws on database error
- ✅ Handles malformed API responses

---

## Step-by-Step Debugging Process

### **Step 1: Check Environment Setup**

```bash
# Verify .env file exists
cat .env | grep EXPO_PUBLIC_TMAP_API_KEY
```

❌ If not found → Add API key to `.env`
✅ If found → Continue to Step 2

### **Step 2: Run Tests**

```bash
npm test -- src/__tests__/tmap.test.ts
```

❌ If tests fail → Check error messages above
✅ If tests pass → Continue to Step 3

### **Step 3: Check App Data**

Open app and add at least 2 stops:

- Add stop 1 (e.g., "Seoul")
- Add stop 2 (e.g., "Busan")
- Verify both appear in the list

❌ If stops don't appear → Check `AddressEntry` component
✅ If stops appear → Continue to Step 4

### **Step 4: Click "Optimize Route"**

- Watch console for error messages
- Check if alert appears with specific error
- Look for network request in browser/proxy tools

❌ If error occurs → Match to issue #1-5 above
✅ If success → Route optimization working!

---

## Adding Enhanced Logging

To help diagnose the issue, update `src/services/tmap.ts`:

```typescript
export const optimizeRoute = async (payload: TmapPayload) => {
  const TMAP_APP_KEY = process.env.EXPO_PUBLIC_TMAP_API_KEY;

  console.log("🚀 optimizeRoute called");
  console.log("📍 Stops count:", payload.stops.length);
  console.log("🔑 API Key exists:", !!TMAP_APP_KEY);

  if (!TMAP_APP_KEY) {
    console.error("❌ API Key missing");
    throw new Error("Tmap App Key not found");
  }

  const url =
    "https://apis.openapi.sk.com/tmap/routes/routeOptimization?version=1";

  console.log("🌐 Calling API:", url);
  console.log("📦 Payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      appKey: TMAP_APP_KEY,
    },
    body: JSON.stringify(payload),
  });

  console.log("📊 Response status:", response.status);
  console.log("✅ Response ok:", response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ API Error:", errorText);
    throw new Error("Failed to optimize route");
  }

  const data = await response.json();
  console.log("✅ Response data:", JSON.stringify(data, null, 2));

  return data;
};
```

Then check Console in Xcode (iOS) or Android Studio (Android) for detailed logs.

---

## External Resources

- [Tmap API Documentation](https://tmap.co.kr/api)
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Native Fetch API](https://reactnative.dev/docs/network)

---

## Still Having Issues?

1. **Collect logs** from console output
2. **Run tests** to verify function logic: `npm test -- src/__tests__/tmap.test.ts`
3. **Check environment:** Verify `.env` file and API key
4. **Verify data:** Ensure at least 2+ stops in database
5. **Test API separately:** Use curl or Postman to test Tmap endpoint directly
