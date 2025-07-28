@echo off
echo Pushing all changes to GitHub...
echo.
echo Current directory: %CD%
echo.
echo Git status:
git status
echo.
echo Adding all files...
git add .
echo.
echo Committing changes...
git commit -m "feat: Add assignment document upload functionality and enhance UI

- Add document upload/replace functionality in AssignmentEditor
- Enhance assignment cards with detailed styling and smart marks input
- Improve visual feedback for document completion toggles
- Update server port configuration to avoid conflicts
- Add comprehensive file upload UI with progress indicators
- Implement FormData handling for document attachments
- Add success/error toast notifications for uploads
- Update assignment completion logic with pre-filled total marks
- Enhance overall user experience with better visual design"
echo.
echo Pushing to GitHub...
git push origin main
echo.
echo Done! All changes have been pushed to GitHub.
pause 