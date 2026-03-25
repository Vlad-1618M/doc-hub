FROM mongo:6.0 AS base

WORKDIR /dbapp

COPY cfgs/ /dbapp/cfgs/
RUN chmod +x /dbapp/cfgs/set_db_creds.sh

EXPOSE 27017
VOLUME /data/db

CMD ["/bin/bash", "-c", "/dbapp/cfgs/set_db_creds.sh /dbapp/cfgs/.env && exec mongod --bind_ip_all"]



