FROM public.ecr.aws/sam/build-nodejs20.x:latest

WORKDIR /var/task

COPY package*.json ./
RUN npm ci --omit=dev --include=optional

COPY . .

CMD ["/bin/bash"]