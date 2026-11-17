FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
        fcgi \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        poppler-utils \
        postgresql-dev \
    && docker-php-ext-install -j"$(nproc)" intl mbstring pgsql pdo_pgsql zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/php/entrypoint.sh /usr/local/bin/studia-entrypoint

RUN chmod +x /usr/local/bin/studia-entrypoint \
    && printf '[www]\nping.path = /ping\npm.status_path = /status\n' \
        > /usr/local/etc/php-fpm.d/zz-healthcheck.conf \
    && printf 'upload_max_filesize=15M\npost_max_size=16M\n' \
        > /usr/local/etc/php/conf.d/zz-uploads.ini

ENTRYPOINT ["studia-entrypoint"]
CMD ["php-fpm", "-F"]
