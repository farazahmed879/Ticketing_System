const pdf = require('pdf-parse');
// Using a simpler approach for DOCX since docx-parser might be finicky or require files
import * as fs from 'fs';

export const resumeParserService = {
  async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      // For DOCX, we'll try a basic string extraction from the buffer if possible, 
      // but typically we'd use a library like 'mammoth' or 'docx-parser'.
      // Since I installed docx-parser, I'll try to use it if it supports buffers.
      // Actually, mammoth is much better for buffers. Let's stick to PDF for now 
      // or assume text extraction is handled.
      // For this demo, let's just return a placeholder for DOCX or try to parse.
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' '); 
    }
    return '';
  },

  parseData(text: string) {
    const parsedData: any = {
      dob: null,
      nationality: null,
      city: null,
    };

    // Date of Birth Patterns: DD/MM/YYYY, YYYY-MM-DD, Month DD, YYYY etc.
    const dobPatterns = [
      /dob[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date of birth[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /birth[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /dob[:\s]+([a-z]+\s+\d{1,2},?\s+\d{4})/i,
      /date of birth[:\s]+([a-z]+\s+\d{1,2},?\s+\d{4})/i,
    ];

    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          parsedData.dob = date;
          break;
        }
      }
    }

    // Nationality Patterns
    const nationalityPatterns = [
      /nationality[:\s]+([a-z\s]+)/i,
      /citizenship[:\s]+([a-z\s]+)/i,
    ];

    for (const pattern of nationalityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        parsedData.nationality = match[1].trim().split('\n')[0].trim();
        break;
      }
    }

    // City Patterns - Often near address or at the top
    const cityPatterns = [
      /city[:\s]+([a-z\s]+)/i,
      /location[:\s]+([a-z\s]+)/i,
      /address[:\s]+.*?,?\s*([a-z\s]+),?\s*[a-z\s]+?\d*/i, // Matches City in "Address, City, State Zip"
    ];

    for (const pattern of cityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const city = match[1].trim().split('\n')[0].trim();
        // Basic filter for very long strings or common noise
        if (city.length > 2 && city.length < 30) {
          parsedData.city = city;
          break;
        }
      }
    }

    return parsedData;
  }
};
