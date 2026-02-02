# Vendor Directory

This directory contains local copies of all critical third-party libraries.

**Phase 2 Complete**: All JavaScript dependencies migrated to local hosting (2026-02-02)

## Resources

| Library | Version | Size | Integrity Hash |
|---------|---------|------|----------------|
| Lucide Icons | 0.562.0 | 378KB | sha384-FmRlymRnpgjuKyAnwH4DftRjl+RqHOlfcw9k4xcpPyovclg/2RZRrvw7qe1koVCP |
| QR Creator | 1.0.0 | 12KB | sha384-cmmVU8dn+rGH6Yvlt0Q1+31iG9lS4wdVsqV/ZP/53RBddef+VZcYakA+NhG4S8wE |
| DOMPurify | 3.2.7 | 22KB | sha384-qJNkHwhlYywDHfyoEe1np+1lYvX/8x+3gHCKFhSSBMQyCFlvFnn+zXmaebXl21rV |
| Three.js | r128 | 589KB | sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu |

**Total Size**: ~1.0MB

## Download Instructions

```bash
cd workers/public/vendor

# Lucide Icons
curl -o lucide.min.js https://unpkg.com/lucide@0.562.0/dist/umd/lucide.min.js

# QR Creator
curl -o qr-creator.min.js https://unpkg.com/qr-creator@1.0.0/dist/qr-creator.min.js

# DOMPurify
curl -o purify.min.js https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js

# Three.js
curl -o three.min.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
```

## Verify Integrity

```bash
# Verify all SRI hashes
for file in lucide.min.js qr-creator.min.js purify.min.js three.min.js; do
  echo "$file: sha384-$(openssl dgst -sha384 -binary $file | openssl base64 -A)"
done
```

## Benefits

- ✅ No external CDN dependencies for critical JS
- ✅ Reduced DNS lookups (3 domains eliminated)
- ✅ Faster initial load (no TLS handshakes to external CDNs)
- ✅ Complete control over resource availability
- ✅ Privacy improvement (no tracking via CDN requests)
- ✅ Works in restricted networks (China, corporate firewalls)
