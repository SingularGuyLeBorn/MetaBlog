
# migrate-to-nest.ps1
$sectionsPath = "d:\ALL IN AI\MetaBlog\docs\sections"
$sections = @('knowledge', 'posts', 'resources', 'about')

cd $sectionsPath

foreach ($section in $sections) {
    Write-Host "Processing Section: $section" -ForegroundColor Green
    
    # 1. Ensure section directory exists
    if (-not (Test-Path $section)) {
        New-Item -ItemType Directory -Path $section
    }
    
    # 2. Move sections/$section.md to sections/$section/$section.md
    $oldSectionMd = "$section.md"
    $newSectionMd = "$section/$section.md"
    if (Test-Path $oldSectionMd) {
        Move-Item $oldSectionMd $newSectionMd -Force
        Write-Host "  Moved section root: $oldSectionMd -> $newSectionMd"
    }
    
    # 3. Handle loose .md files within the section (except the root one we just moved)
    Get-ChildItem -Path $section -Filter "*.md" -File | ForEach-Object {
        $fileName = $_.BaseName
        if ($fileName -eq $section) { return } # Skip the section root md
        
        $folderPath = Join-Path $section $fileName
        $targetPath = Join-Path $folderPath "$fileName.md"
        
        if (-not (Test-Path $folderPath)) {
            New-Item -ItemType Directory -Path $folderPath
        }
        
        Move-Item $_.FullName $targetPath -Force
        Write-Host "  Nested file: $($_.Name) -> $fileName/$fileName.md"
    }
    
    # 4. Handle pre-existing directories (ensure they have a matching .md file)
    Get-ChildItem -Path $section -Directory -Recurse | ForEach-Object {
        $dir = $_
        $dirName = $dir.Name
        $expectedMd = Join-Path $dir.FullName "$dirName.md"
        
        if (-not (Test-Path $expectedMd)) {
            # Try to see if there's an index.md we should rename or just create a placeholder
            $indexMd = Join-Path $dir.FullName "index.md"
            if (Test-Path $indexMd) {
                Move-Item $indexMd $expectedMd -Force
                Write-Host "  Renamed index: $($dir.FullName)\index.md -> $dirName.md"
            } else {
                # Create placeholder
                "---`ntitle: $dirName`n---`n`n# $dirName`n" | Out-File $expectedMd -Encoding utf8
                Write-Host "  Created placeholder: $expectedMd"
            }
        }
    }

    # 5. Final check for deep nesting (recursive move of any md NOT in its matching directory)
    # This addresses cases like resources/node-L1/node-L2/leaf-3-1.md needing to be in leaf-3-1/leaf-3-1.md
    Get-ChildItem -Path $section -Filter "*.md" -File -Recurse | ForEach-Object {
        $file = $_
        $parentDir = $file.Directory.Name
        $baseName = $file.BaseName
        
        if ($parentDir -ne $baseName) {
            $newFolder = Join-Path $file.DirectoryName $baseName
            if (-not (Test-Path $newFolder)) { New-Item -ItemType Directory -Path $newFolder }
            $newPath = Join-Path $newFolder "$baseName.md"
            Move-Item $file.FullName $newPath -Force
            Write-Host "  Corrected recursive nesting: $($file.FullName) -> $newPath"
        }
    }
}
