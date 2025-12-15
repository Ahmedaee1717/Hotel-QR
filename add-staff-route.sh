#!/bin/bash

# Find the line number where we want to insert
LINE=$(grep -n "^app.get('/admin/restaurant/:offering_id'" /home/user/webapp/src/index.tsx | cut -d: -f1)

if [ -z "$LINE" ]; then
  echo "Could not find insertion point"
  exit 1
fi

# Insert line number is before that line
INSERT_LINE=$((LINE - 1))

echo "Inserting staff dashboard route at line $INSERT_LINE"

# Read the template
TEMPLATE=$(cat /home/user/webapp/staff-dashboard-template.html)

# Create the route code
cat > /tmp/staff-route-insert.txt << 'ROUTE'
// Staff Check-in Dashboard
app.get('/staff/restaurant/:offering_id', (c) => {
  const { offering_id } = c.req.param()
  
  const html = `TEMPLATE_CONTENT_HERE`
  
  return c.html(html.replace(/OFFERING_ID_PLACEHOLDER/g, offering_id))
})

ROUTE

# Escape the template for insertion (replace backticks)
ESCAPED_TEMPLATE=$(echo "$TEMPLATE" | sed 's/`/\\`/g' | sed 's/\$/\\\$/g')

# Replace placeholder with actual template
sed "s|TEMPLATE_CONTENT_HERE|$ESCAPED_TEMPLATE|" /tmp/staff-route-insert.txt > /tmp/final-route.txt

# Insert into index.tsx
head -n $INSERT_LINE /home/user/webapp/src/index.tsx > /tmp/index-new.tsx
cat /tmp/final-route.txt >> /tmp/index-new.tsx
tail -n +$((INSERT_LINE + 1)) /home/user/webapp/src/index.tsx >> /tmp/index-new.tsx

# Backup and replace
cp /home/user/webapp/src/index.tsx /home/user/webapp/src/index.tsx.backup
mv /tmp/index-new.tsx /home/user/webapp/src/index.tsx

echo "Staff dashboard route added successfully!"
