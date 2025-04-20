const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

const config = JSON.parse(fs.readFileSync('./deploy.config.json', 'utf8'));

const envVars = Object.entries(process.env)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');

const imageTag = `gcr.io/${config.projectId}/${config.serviceName}`;

const buildCmd = `gcloud builds submit --tag ${imageTag}`;
const deployCmd = `gcloud run deploy ${config.serviceName} --image ${imageTag} --region ${config.region} --platform managed --project ${config.projectId} --set-env-vars ${envVars}`;

console.log('Running:', buildCmd);
execSync(buildCmd, { stdio: 'inherit' });

console.log('Running:', deployCmd);
execSync(deployCmd, { stdio: 'inherit' });
