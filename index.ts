import { readdirSync, readFileSync } from "fs";
import { createServer } from "http";
import { join, extname } from "path";
import mime from "mime-types";

console.log("Serving from /var/www/html/");
console.log("Caching all files in directory");

const file_cache: { [key: string]: Buffer } = {};

readdirSync("/var/www/html/").forEach((file) => {
    const filePath = join("/var/www/html/", file);
    const fileContent = readFileSync(filePath);
    
    file_cache[file] = fileContent;
    
    console.log(`Cached ${file}`);
});

const vue_route_paths = [
    "contact",
    "api",
    "docs",
    "free-encrypted-chat",
    "privacy",
    "privacy-policy",
    "terms",
    "terms-of-service",
    "terms-of-use",
    "", //intentionally empty (index.html)
    "index"
];

createServer((req, res) => {
    const filePath = req.url?.substring(1);
    
    if (filePath && file_cache[filePath]) {
        const mimeType = mime.lookup(extname(filePath)) || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': mimeType });
        
        res.end(file_cache[filePath]);
    } else {
        let vue_route = vue_route_paths.find((route) => req.url?.endsWith(route));
        
        if(!vue_route) { //try with .html
            vue_route = vue_route_paths.find((route) => req.url?.endsWith(route + ".html"));
        }
        
        if(!vue_route) { //try with trailing slash
            vue_route = vue_route_paths.find((route) => req.url?.endsWith(route + "/"));
        }
        
        if (vue_route) {
            
            res.setHeader('X-Robots-Tag', 'index, follow');
            
            //deny iframe
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
            res.setHeader('X-XSS-Protection',  '1; mode=block');
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(file_cache['index.html']);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(file_cache['index.html']);
        }
    }
}).listen(3000, () => {
    console.log("Server is listening on port 3000");
});
