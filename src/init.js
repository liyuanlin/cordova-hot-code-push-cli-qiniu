import es6promise from 'es6-promise';

es6promise.polyfill();

import path from 'path';
import prompt from 'prompt';
import _ from 'lodash';

import { getInput, writeFile } from './utils';

const configFile = path.join(process.cwd(), 'cordova-hcp.json');

const name = {
  description: 'Enter project name (required)',
  pattern: /^[a-zA-Z\-\s0-9]+$/,
  message: 'Name must be only letters, numbers, space or dashes',
  required: true,
};

const bucket = {
  description: 'QiNiu Bucket name (required for cordova-hcp deploy)',
  pattern: /^[a-zA-Z\-0-9\.]+$/,
  message: 'Name must be only letters, numbers, or dashes',
};

const prefix = {
  description: 'Path in QiNiu bucket (optional for cordova-hcp deploy)',
  pattern: /^[a-zA-Z\-\s0-9\.\/]+\/$/,
  message: 'Path must be only letters, numbers, spaces, forward slashes or dashes and must end with a forward slash',
};

const iosIdentifier = {
  description: 'IOS app identifier',
  pattern: /^[a-zA-Z\-0-9\.]+$/,
};

const androidIdentifier = {
  description: 'Android app identifier',
  pattern: /^[a-zA-Z\-0-9\.]+$/,
};

const update = {
  description: 'Update method (required)',
  pattern: /(start|resume|now)/,
  required: true,
  message: 'Needs to be one of start, resume or now',
  default: 'resume',
};

const schema = {
  properties: {
    name,
    bucket,
    prefix,
    ios_identifier: iosIdentifier,
    android_identifier: androidIdentifier,
    update,
  },
};

const urlSchema = {
  properties: {
    content_url: {
      description: 'Enter full URL to directory where cordova-hcp build result will be uploaded',
      message: 'Must supply URL',
      required: true,
    },
  },
};

export function execute(context) {
  prompt.override = context.argv;
  prompt.message = 'Please provide';
  prompt.delimiter = ': ';
  prompt.start();

  let result;

  getInput(prompt, schema)
    .then(validateBucket)
    .then(res => result = res)
    .then(getUrl)
    .then(url => _.assign(result, url))
    .then(content => writeFile(configFile, content))
    .then(done);
}

function validateBucket(result) {
  if (!result.bucket) {
    return _.omit(result, ['bucket', 'prefix']);
  }

  return result;
}

function getUrl({ prefix: path }) {
  return { content_url: getContentUrl(path) };
}

function getContentUrl(path) {
  let url = '';
  url = `https://img.cdn.scevdou.com/${path}`
  return url;
}

function done(err) {
  if (err) {
    return console.log(err);
  }
  console.log('Project initialized and cordova-hcp.json file created.');
  console.log('If you wish to exclude files from being published, specify them in .chcpignore');
  console.log('Before you can push updates you need to run "cordova-hcp login" in project directory');
}
