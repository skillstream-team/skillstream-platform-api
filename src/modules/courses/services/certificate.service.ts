import PDFDocument from 'pdfkit';

export interface CertificateData {
  id: string;
  student: {
    username: string;
    email: string;
  };
  course: {
    title: string;
    description?: string;
  };
  issuedAt: Date;
  certificateNumber?: string;
}

export class CertificateService {
  /**
   * Generate PDF certificate
   */
  async generatePDF(certificate: CertificateData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Background/border (decorative)
        doc.rect(0, 0, doc.page.width, doc.page.height)
           .strokeColor('#E8E8E8')
           .lineWidth(3)
           .stroke();

        // Inner border
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .strokeColor('#667eea')
           .lineWidth(2)
           .stroke();

        // Header section
        doc.fontSize(36)
           .fillColor('#667eea')
           .font('Helvetica-Bold')
           .text('Certificate of Completion', doc.page.width / 2, 100, {
             align: 'center',
             width: doc.page.width - 100
           });

        // Decorative line
        doc.moveTo(100, 150)
           .lineTo(doc.page.width - 100, 150)
           .strokeColor('#667eea')
           .lineWidth(2)
           .stroke();

        // Main text
        doc.fontSize(24)
           .fillColor('#333333')
           .font('Helvetica')
           .text('This is to certify that', doc.page.width / 2, 200, {
             align: 'center',
             width: doc.page.width - 100
           });

        // Student name
        doc.fontSize(32)
           .fillColor('#667eea')
           .font('Helvetica-Bold')
           .text(certificate.student.username, doc.page.width / 2, 260, {
             align: 'center',
             width: doc.page.width - 100
           });

        // Course completion text
        doc.fontSize(20)
           .fillColor('#666666')
           .font('Helvetica')
           .text('has successfully completed the course', doc.page.width / 2, 330, {
             align: 'center',
             width: doc.page.width - 100
           });

        // Course title
        doc.fontSize(28)
           .fillColor('#333333')
           .font('Helvetica-Bold')
           .text(certificate.course.title, doc.page.width / 2, 380, {
             align: 'center',
             width: doc.page.width - 100
           });

        // Date section
        const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        doc.fontSize(16)
           .fillColor('#666666')
           .font('Helvetica')
           .text(`Issued on ${issueDate}`, doc.page.width / 2, 480, {
             align: 'center',
             width: doc.page.width - 100
           });

        // Certificate number
        if (certificate.certificateNumber) {
          doc.fontSize(12)
             .fillColor('#999999')
             .font('Helvetica')
             .text(`Certificate ID: ${certificate.certificateNumber}`, doc.page.width / 2, 520, {
               align: 'center',
               width: doc.page.width - 100
             });
        } else {
          // Use certificate ID as certificate number
          doc.fontSize(12)
             .fillColor('#999999')
             .font('Helvetica')
             .text(`Certificate ID: ${certificate.id.substring(0, 8).toUpperCase()}`, doc.page.width / 2, 520, {
               align: 'center',
               width: doc.page.width - 100
             });
        }

        // Footer
        doc.fontSize(14)
           .fillColor('#999999')
           .font('Helvetica-Oblique')
           .text('SkillStream Platform', doc.page.width / 2, doc.page.height - 80, {
             align: 'center',
             width: doc.page.width - 100
           });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stream PDF certificate (for direct HTTP response)
   */
  generatePDFStream(certificate: CertificateData) {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Background/border
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .strokeColor('#E8E8E8')
       .lineWidth(3)
       .stroke();

    // Inner border
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
       .strokeColor('#667eea')
       .lineWidth(2)
       .stroke();

    // Header
    doc.fontSize(36)
       .fillColor('#667eea')
       .font('Helvetica-Bold')
       .text('Certificate of Completion', doc.page.width / 2, 100, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Decorative line
    doc.moveTo(100, 150)
       .lineTo(doc.page.width - 100, 150)
       .strokeColor('#667eea')
       .lineWidth(2)
       .stroke();

    // Main text
    doc.fontSize(24)
       .fillColor('#333333')
       .font('Helvetica')
       .text('This is to certify that', doc.page.width / 2, 200, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Student name
    doc.fontSize(32)
       .fillColor('#667eea')
       .font('Helvetica-Bold')
       .text(certificate.student.username, doc.page.width / 2, 260, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Course completion text
    doc.fontSize(20)
       .fillColor('#666666')
       .font('Helvetica')
       .text('has successfully completed the course', doc.page.width / 2, 330, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Course title
    doc.fontSize(28)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text(certificate.course.title, doc.page.width / 2, 380, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Date
    const issueDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.fontSize(16)
       .fillColor('#666666')
       .font('Helvetica')
       .text(`Issued on ${issueDate}`, doc.page.width / 2, 480, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Certificate number
    if (certificate.certificateNumber) {
      doc.fontSize(12)
         .fillColor('#999999')
         .font('Helvetica')
         .text(`Certificate ID: ${certificate.certificateNumber}`, doc.page.width / 2, 520, {
           align: 'center',
           width: doc.page.width - 100
         });
    } else {
      // Use certificate ID as certificate number
      doc.fontSize(12)
         .fillColor('#999999')
         .font('Helvetica')
         .text(`Certificate ID: ${certificate.id.substring(0, 8).toUpperCase()}`, doc.page.width / 2, 520, {
           align: 'center',
           width: doc.page.width - 100
         });
    }

    // Footer
    doc.fontSize(14)
       .fillColor('#999999')
       .font('Helvetica-Oblique')
       .text('SkillStream Platform', doc.page.width / 2, doc.page.height - 80, {
         align: 'center',
         width: doc.page.width - 100
       });

    return doc;
  }
}

export const certificateService = new CertificateService();

