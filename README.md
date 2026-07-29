This is an open source Vercel-like built on open source alternaitves. It accepts a git repository, builds the project in a worker and stores build artifacts for deployment.

FEATURES --- 
- asynchronous deployment queue (BullMQ + Redis)
- MinIO object storage
- Worker based build pipeline
- Automatic dependency installation
- Temporary workspace cleanup

This project takes use of----> Typescript, Fastify, BullMQ, Redis, MinIO(S3 compatible), Docker, AWS SDK 3, simple-git, Execa.

The architechture is fairly simple.

Client -> Fastify API Server -> Upload Source -> MinIO storage -> BullMQ + Redis -> Build Worker -> npm install + npm run build + [future features]

##Running locally

###Clone

```bash
git clone <repo-url>
cd vercel-clone
```
###Install
```bash
npm install
```
###Start the application

```bash
docker compose up -d
```

###Run API

```bash
npm run dev
```

###Run Worker

```bash
npm run worker
```
--------------

##API
###Deploy Repository

```http
POST /deploy
```
Request

```json
{
  "repoUrl": "https://github.com/user/project.git"
}
```

Response

```json
{
  "deploymentId": "...",
  "status": "queued"
}
```

## Current Progress

- [x] Repository cloning
- [x] Upload source to MinIO
- [x] Queue deployments
- [x] Worker downloads source
- [x] Install dependencies
- [x] Build project
- [ ] Upload build artifacts
- [ ] Serve deployments
- [ ] Custom domains
- [ ] Deployment logs
- [ ] Build status API

## Future Improvements (hopefully I don't get engaged in another project)

- pnpm & Yarn support
- Parallel workers
- Deployment logs
- Build caching
- Kubernetes support
- Custom domains
- Authentication

---
