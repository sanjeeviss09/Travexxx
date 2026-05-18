Write-Host "Starting Axxelent Transport Platform..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command cd backend; npm install; npm run dev"
Start-Process powershell -ArgumentList "-NoExit -Command cd frontend; npm install; npm run dev"
Write-Host "Services started in new windows!" -ForegroundColor Blue
