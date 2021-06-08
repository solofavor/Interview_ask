const http = require('http');
const fetch = require('node-fetch');
const ips = [];
const isLimitOver = ip => ip && ips.filter(item => item === ip).length > 2;
const getBidderData = (ip, ua) => fetch(`http://127.0.0.1:8080/api/bidder?ip=${ip}&ua=${ua}`)
  .then(res => res.json());
const getRandomBid = () => Math.random() * 10;
const getRandomUserURL = () => encodeURI(Math.random().toString(36).replace(/[^a-z]+/g, ''));
const getURL = (request) => {
  const protocol = request.connection.encrypted
    ? 'https'
    : 'http';

  return new URL(protocol + '://' + request.headers.host + request.url);
};
const getParams = (request, ...args) => {
  if (!request || !args.length) {
    return {};
  }

  const url = getURL(request);
  const params = {};

  args.forEach(key => params[key] = url.searchParams.get(key));

  return params;
};
const bidder = (request, response) => {
  const { ip, ua } = getParams(request, 'ip', 'ua');

  if (ip && ua) {
    const bid = getRandomBid();
    const url = getRandomUserURL();

    response.setHeader('Content-Type', 'application/json');
    response.write(JSON.stringify({ bid, url }));

    return response.end();
  }

  return noPage(response);
};
const auction = (request, response) => {
  const { ip, ua } = getParams(request, 'ip', 'ua');

  if (isLimitOver(ip)) {
    return response.end();
  }

  if (ip && ua) {
    ips.push(ip);

    return Promise.all([
      getBidderData(ip, ua),
      getBidderData(ip, ua),
      getBidderData(ip, ua)])
        .then(values => {
          const sortedValues = values.sort((a, b) => a.bid - b.bid);
          const biggestBidder = sortedValues[values.length - 1];

          response.writeHead(302, {
            'Location': `http://127.0.0.1:8080/user/${biggestBidder.url}`
          });
          response.end();
        });
  }

  return noPage(response);
};
const noPage = (response) => {
  response.statusCode = 404;
  response.end();
};
const hostname = '127.0.0.1';
const port = 8080;
const server = http.createServer((request, response) => {
  if (request.url.startsWith('/api/bidder?')) {
    return bidder(request, response);
  }

  if (request.url.startsWith('/api/auction?')) {
    return auction(request, response);
  }

  if (request.url.startsWith('/user/')) {
    return response.end('User page...');
  }

  noPage(response);
});

server.listen(port, hostname, () => {
  console.info(`Server running at http://${hostname}:${port}/`);
});
