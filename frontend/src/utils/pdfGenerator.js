export const downloadGatePassPDF = (gp) => {
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  
  const materialsRows = (gp.gate_pass_materials || []).map((m, idx) => `
    <tr>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">${m.description}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${m.quantity}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${m.uom}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb;">${m.remarks || '—'}</td>
    </tr>
  `).join('');

  const employeeName = gp.employees?.name || gp.drivers?.name || '—';
  const employeeId = gp.employees?.employee_id || (gp.drivers ? gp.drivers.driver_id : '—');
  const employeeDept = gp.employees?.department || (gp.drivers ? 'Driver' : '—');
  const employeeMobile = gp.employees?.mobile || (gp.drivers ? gp.drivers.mobile : '—');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Gate Pass - ${gp.gate_pass_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 15mm; }
          body { 
            font-family: 'Inter', sans-serif; 
            color: #1f2937; 
            margin: 0; 
            padding: 0;
            line-height: 1.5; 
            background: white;
          }
          .container { max-width: 800px; margin: 0 auto; }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .company-name { 
            font-size: 28px; 
            font-weight: 800; 
            color: #1e3a8a; 
            text-transform: uppercase; 
            letter-spacing: 1.5px; 
            margin-bottom: 5px;
          }
          .title { 
            font-size: 18px; 
            font-weight: 700; 
            color: #4b5563; 
            text-transform: uppercase; 
            letter-spacing: 1px;
          }
          .pass-no-container {
            margin-top: 15px;
            display: inline-block;
            background: #f3f4f6;
            padding: 10px 20px;
            border-radius: 8px;
            border: 1px dashed #cbd5e1;
          }
          .pass-no { 
            font-size: 20px; 
            font-weight: 800; 
            color: #2563eb; 
            font-family: monospace; 
          }
          
          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .info-box {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            background: #f8fafc;
          }
          .info-box-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          
          .info-row { display: flex; margin-bottom: 8px; font-size: 14px; }
          .info-label { width: 130px; font-weight: 600; color: #475569; }
          .info-value { flex: 1; font-weight: 700; color: #0f172a; }

          .materials-section { margin-top: 30px; margin-bottom: 40px; }
          .materials-table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 14px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .materials-table th { 
            background-color: #2563eb; 
            color: white; 
            font-weight: 600; 
            padding: 12px; 
            border: 1px solid #1e40af; 
            text-align: left; 
            text-transform: uppercase; 
            font-size: 12px; 
            letter-spacing: 0.5px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .status-approved { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .status-pending { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
          .status-denied { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          
          .footer-sigs { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 80px; 
          }
          .sig-box { text-align: center; width: 28%; }
          .sig-line { border-bottom: 1px solid #1e293b; height: 50px; margin-bottom: 10px; }
          .sig-label { font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; }
          
          .print-btn { display: none; }
          
          @media print {
            body { padding: 0; background: white; }
            .container { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-name">REVEXY TRANSPORT LOGISTICS</div>
            <div class="title">Official Material Gate Pass</div>
            <div class="pass-no-container">
              <div class="pass-no">${gp.gate_pass_number}</div>
            </div>
          </div>

          <div class="grid-container">
            <!-- Profile Info -->
            <div class="info-box">
              <div class="info-box-title">Requestor Profile</div>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${employeeName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">ID / Code:</span>
                <span class="info-value">${employeeId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Department:</span>
                <span class="info-value">${employeeDept}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact No:</span>
                <span class="info-value">${employeeMobile}</span>
              </div>
            </div>

            <!-- Transfer Info -->
            <div class="info-box">
              <div class="info-box-title">Transfer Details</div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${gp.created_at ? new Date(gp.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">
                  <span class="status-badge status-${gp.status.toLowerCase()}">${gp.status}</span>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Dispatched To:</span>
                <span class="info-value">${gp.dispatched_to}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Material Type:</span>
                <span class="info-value" style="color: ${gp.material_type === 'RETURNABLE' ? '#b45309' : '#047857'}">${gp.material_type}</span>
              </div>
              ${gp.expected_return_date ? `
              <div class="info-row">
                <span class="info-label">Return Date:</span>
                <span class="info-value" style="color: #b45309;">${new Date(gp.expected_return_date).toLocaleDateString('en-IN')}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <div class="info-row" style="margin-bottom: 8px;">
              <span class="info-label" style="width: 150px;">Purpose:</span>
              <span class="info-value">${gp.purpose || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label" style="width: 150px;">Transfer Vehicle:</span>
              <span class="info-value">${gp.mode_of_transfer_vehicle_no || '—'}</span>
            </div>
          </div>

          <div class="materials-section">
            <div class="info-box-title" style="border:none; margin-bottom: 5px;">Materials List</div>
            <table class="materials-table">
              <thead>
                <tr>
                  <th style="width: 8%; text-align: center;">S.No</th>
                  <th style="width: 45%;">Description</th>
                  <th style="width: 12%; text-align: center;">Qty</th>
                  <th style="width: 15%; text-align: center;">UOM</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${materialsRows}
              </tbody>
            </table>
          </div>

          <div class="footer-sigs">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Requestor Signature</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Security Gate Entry</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Authorized Admin Sign</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
