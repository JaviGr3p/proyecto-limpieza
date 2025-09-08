#!/bin/bash
# Save as test-nginx.sh in your project root

echo "Testing nginx configuration..."
docker exec frontend nginx -t

if [ $? -eq 0 ]; then
    echo "Configuration is valid. Reloading nginx..."
    docker exec frontend nginx -s reload
    echo "Nginx reloaded successfully"
else
    echo "Configuration test failed"
    exit 1
fi
