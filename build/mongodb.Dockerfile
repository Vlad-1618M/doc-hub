FROM mongo:6.0 AS base

WORKDIR /dbapp

COPY cfgs/ /dbapp/cfgs/
RUN chmod +x /dbapp/cfgs/set_db_creds.sh

EXPOSE 27017
VOLUME /data/db

# Local builds usually COPY gitignored cfgs/.env; CI only has committed cfgs/.env.ci.
CMD ["/bin/bash", "-c", "ENVF=/dbapp/cfgs/.env; [ -f \"$ENVF\" ] || ENVF=/dbapp/cfgs/.env.ci; /dbapp/cfgs/set_db_creds.sh \"$ENVF\""]



