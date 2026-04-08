# Testing Guide - Listing Generator Optimizations

## Quick Test Flow

### 1. Login Screen Test
```
URL: http://localhost:3000/login (or production URL)

Test each role:
✓ Geo / 6868 → Should show all tabs
✓ Japan / 7878 → Should show limited tabs (Marketplaces, Social Content, AI Picks)
✓ Ebay / 8888 → Should show Marketplaces, AI Picks only
✓ Amazon / 9999 → Should show Marketplaces, AI Picks only
✓ SEO / 3333 → Should show Marketplaces, Social Content, AI Picks
✓ Trading / 6789 → Should show Marketplaces, AI Picks, Newsletter

Wrong password → Error message
No role selected → Error message
Logout button → Redirect to login
```

### 2. Image Analysis Test
```
1. Log in as any role
2. Upload 1-3 product images
3. Check status indicator:
   - Shows "Analyzing images..." with spinner
   - Changes to "✓ X images analyzed — features extracted"
4. Upload more images
   - Should re-analyze automatically
5. Remove images
   - Status updates accordingly
```

### 3. Generation Test - Full Access (Geo)
```
1. Log in as Geo / 6868
2. Fill product form:
   - Product Name: "XTRONS 10.1 Android Car Stereo"
   - Category: "Car Stereo"
   - Key Features: (add 3-4 features)
   - Compatible Cars: "BMW 3 Series F30 2012-2019"
3. Set Title Variations: 1 (default)
4. Upload 2 images
5. Wait for image analysis
6. Click "Generate All Listings"
7. Verify all tabs appear:
   ✓ Marketplaces (Amazon UK/US/DE/JP, eBay, AliExpress, Alibaba, Yahoo JP, Rakuten, WooCommerce, Yahoo Auction)
   ✓ Social Content (Facebook EN/DE/JP/B2B, YouTube, Twitter EN/JP, LINE, Reddit)
   ✓ AI Picks (Recommendations)
   ✓ Newsletter
8. Check generated content quality
```

### 4. Generation Test - Restricted Role (Ebay)
```
1. Logout, login as Ebay / 8888
2. Fill same product form
3. Upload images (should still analyze)
4. Generate
5. Verify ONLY these sections appear:
   ✓ Marketplaces tab exists
   ✓ Within Marketplaces: ONLY eBay content generated
   ✓ AI Picks tab exists
   ✗ No Amazon, no WooCommerce, no other marketplaces
   ✗ No Social Content tab
   ✗ No Newsletter tab
```

### 5. Generation Test - Japan Role
```
1. Login as Japan / 7878
2. Fill product form with Japan-relevant product
3. Generate
4. Verify:
   ✓ Marketplaces: Amazon JP, Rakuten, Yahoo JP, Yahoo Auction ONLY
   ✗ No Amazon UK/US/DE
   ✗ No eBay, AliExpress, Alibaba, WooCommerce
   ✓ Social Content: LINE, Facebook JP, Twitter JP ONLY
   ✗ No Facebook EN/DE/B2B, no YouTube, no Reddit
   ✓ AI Picks
   ✗ No Newsletter
```

### 6. Token Usage Comparison
```
Before (Geo role, 3 title variations, images as base64):
- Check DeepSeek dashboard
- Note total tokens

After (Ebay role, 1 title variation, image analysis):
- Generate same product with Ebay role
- Compare token usage
- Expected: ~85% reduction

Verify image analysis API call:
- Should see 1 call to /api/analyze-images (small)
- Should NOT see images in /api/generate payload
```

### 7. Export Test
```
WooCommerce:
1. Generate as SEO role
2. Navigate to Marketplaces > WooCommerce
3. Try language tabs (EN, DE, FR, ES, IT, JP, NL, PL)
4. Click "Generate [Language]" for non-EN languages
5. Verify translation appears
6. Click "Export CSV" → Download file
7. Click "Export TXT" → Download file
8. Open both files, verify format

Alibaba:
1. Generate as Trading role
2. Navigate to Marketplaces > Alibaba
3. Click "Export" button
4. Verify .txt file downloads with B2B fields
```

### 8. Mobile Responsiveness (Optional)
```
1. Open on mobile device or use browser dev tools
2. Test login screen
3. Test form input
4. Test generated content scrolling
5. Verify tabs work
6. Check copy buttons
```

## Expected Behavior Summary

| Role | Amazon UK/US/DE | Amazon JP | eBay | Alibaba | WooCommerce | Social | Newsletter |
|------|----------------|-----------|------|---------|-------------|--------|------------|
| Geo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ All | ✅ |
| Japan | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ JP only | ❌ |
| Ebay | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Amazon | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SEO | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ All | ❌ |
| Trading | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ B2B only | ✅ |

## Common Issues & Fixes

### Issue: "User role not set" error
**Fix:** Logout and login again. Clear localStorage if needed.

### Issue: Wrong tabs showing after role change
**Fix:** Hard refresh page (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: Image analysis stuck
**Fix:** Remove and re-add images. Check console for errors.

### Issue: Build fails
**Fix:** 
```bash
rm -rf node_modules .next
npm install
npm run build
```

### Issue: Vercel deployment fails
**Fix:** Check environment variables in Vercel dashboard:
- `DEEPSEEK_API_KEY` must be set

## Performance Benchmarks

### Target Metrics:
- Login → Dashboard: < 500ms
- Image analysis (3 images): < 5 seconds
- Full generation (Geo role): < 30 seconds
- Restricted generation (Ebay role): < 10 seconds

### Token Usage Targets:
- Geo role: ~8,000-12,000 tokens
- Ebay role: ~1,500-2,500 tokens
- Japan role: ~3,000-5,000 tokens
- Image analysis: ~500 tokens (one-time)

## Reporting Issues

When reporting bugs, include:
1. Role used
2. Browser + version
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (F12 → Console tab)
6. Network tab screenshot if API-related
