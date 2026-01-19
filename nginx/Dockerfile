FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create directories for static files
RUN mkdir -p /app/static /app/media

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
