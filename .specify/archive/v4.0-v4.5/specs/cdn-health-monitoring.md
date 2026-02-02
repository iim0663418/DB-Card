# CDN Health Monitoring

## Feature
As an administrator  
I want to monitor third-party CDN health  
So that I can detect CDN failures before users report issues

## Background
The system relies on 4 critical CDN resources:
- Three.js r128 (cdnjs.cloudflare.com)
- QRious 4.0.2 (cdnjs.cloudflare.com)
- DOMPurify 3.2.7 (cdnjs.cloudflare.com)
- Lucide 0.562.0 (unpkg.com)

## Scenario 1: Check all CDN health
**Given** admin is authenticated  
**When** GET /api/admin/cdn-health is called  
**Then** return JSON with all CDN statuses:
```json
{
  "cdns": [
    {
      "name": "Three.js r128",
      "url": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
      "status": "healthy",
      "responseTime": 45
    }
  ],
  "timestamp": 1737450000000
}
```

## Scenario 2: Display CDN health in admin dashboard
**Given** admin is on System Health tab  
**When** page loads  
**Then** display CDN health card with:
- Green indicator for healthy CDN (status 200)
- Red indicator for failed CDN (status != 200)
- Response time in milliseconds
- Last check timestamp

## Scenario 3: Handle CDN failure
**Given** a CDN is unreachable  
**When** health check is performed  
**Then** return status "failed" with error message

## Implementation Notes
- Use HEAD request (faster than GET)
- Timeout: 5 seconds per CDN
- No caching (real-time check)
- Admin authentication required

## Acceptance Criteria
- ✅ All 4 CDNs checked in parallel
- ✅ Response time < 10 seconds total
- ✅ Clear visual indicators (green/red)
- ✅ Manual refresh button
- ✅ Error handling for network failures
