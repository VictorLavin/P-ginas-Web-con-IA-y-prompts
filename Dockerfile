FROM php:8.3-apache
COPY . /var/www/html/
RUN mkdir -p /var/www/html/uploads /var/www/html/data \
 && chown -R www-data:www-data /var/www/html/uploads /var/www/html/data \
 && chmod 775 /var/www/html/uploads /var/www/html/data
EXPOSE 80
