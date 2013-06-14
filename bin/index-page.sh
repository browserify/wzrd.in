#!/bin/bash

(cat <<-EOF
<!doctype html>
<html>
  <head>
    <title>Browserify CDN</title>
  </head>
  <body>
EOF
) > ./public/index.html

marked ./README.md >> ./public/index.html

(cat <<-EOF
  </body>
</html>
EOF
) >> ./public/index.html
