import path from 'path';

const PROFILE_IMAGES = [
  path.resolve('./image/Hiinagi-Nao-1.png'),
  path.resolve('./image/Hiinagi-Nao-2.png'),
  path.resolve('./image/Hiinagi-Nao-3.png')
];

function random(arr) {
  return arr[
    Math.floor(Math.random() * arr.length)
  ];
}

export async function generateSelfie() {
  return {
    image: random(PROFILE_IMAGES),
    caption: random([
      'nih 😒',
      'pap mulu dah',
      'udah puas? 😑',
      'jangan diketawain',
      'cuma satu ya'
    ])
  };
}

export async function generateCosplay() {
  return {
    image: random(PROFILE_IMAGES),
    caption: random([
      'hehe ✨',
      'cosplay dikit aja',
      'gimana?',
      'cocok gak?'
    ])
  };
}

export async function generateRandomPhoto() {
  return {
    image: random(PROFILE_IMAGES),
    caption: random([
      '',
      'random aja',
      'nih',
      'wkwk'
    ])
  };
}