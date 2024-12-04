// public/pdf-worker.js
import * as pdfjs from 'pdfjs-dist';
import PDFWorker from 'pdfjs-dist/build/pdf.js';

pdfjs.GlobalWorkerOptions.workerSrc = PDFWorker;
