
FROM python:3.10

WORKDIR /dbapp

COPY deps/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
ENV PYTHONPATH="/dbapp:/dbapp/src"

# CMD ["/bin/bash", "./sh_scripts/app_run.sh"]
CMD ["/bin/bash", "./build/sh_scripts/app_run.sh"]


