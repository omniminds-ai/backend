FROM node:lts-bookworm

WORKDIR /usr/src/app/backend/
#
COPY package*.json ./
#COPY jailbreak-pool/Anchor.toml ./
#COPY jailbreak-pool/target ./target

# pull the aws documentdb cert and pipeline binary
#ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem ./aws-global-bundle.pem
ADD https://github.com/omniminds-ai/analyze-training/releases/latest/download/analyze-training-linux-x64 ./analyze-training
RUN #chmod +x ./analyze-training

# Install dependencies including guacamole build requirements
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  build-essential \
  python3 \
  ffmpeg

RUN npm ci
RUN npm install --cpu=x64 --os=linux --libc=glibc sharp
RUN npm install --global tsx

COPY . .

RUN npm run build
CMD ["npm", "start"]
EXPOSE 8001
