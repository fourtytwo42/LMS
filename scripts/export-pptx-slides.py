#!/usr/bin/env python3
"""
Export all slides from a PPTX file as PNG images using LibreOffice UNO API.
Usage: python3 export-pptx-slides.py <input_pptx> <output_dir>
"""
import sys
import os
import subprocess
import time

def export_slides(input_file, output_dir):
    """Export all slides from PPTX to PNG images."""
    try:
        import uno
        from com.sun.star.beans import PropertyValue
        from com.sun.star.connection import NoConnectException
        
        # Kill any existing LibreOffice instances
        try:
            subprocess.run(['pkill', '-f', 'libreoffice.*2002'], check=False, timeout=2, 
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(1)
        except:
            pass
        
        # Start LibreOffice in headless mode
        lo_process = subprocess.Popen([
            'libreoffice',
            '--headless',
            '--invisible',
            '--nodefault',
            '--nologo',
            '--norestore',
            '--accept=socket,host=localhost,port=2002;urp;'
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Wait for LibreOffice to start
        time.sleep(3)
        
        # Connect to LibreOffice
        local_context = uno.getComponentContext()
        resolver = local_context.ServiceManager.createInstanceWithContext(
            "com.sun.star.bridge.UnoUrlResolver", local_context
        )
        
        max_attempts = 10
        context = None
        for attempt in range(max_attempts):
            try:
                context = resolver.resolve("uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext")
                break
            except NoConnectException:
                if attempt < max_attempts - 1:
                    time.sleep(1)
                else:
                    raise Exception("Could not connect to LibreOffice after 10 attempts")
        
        desktop = context.ServiceManager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", context
        )
        
        # Open the presentation
        file_url = uno.systemPathToFileUrl(os.path.abspath(input_file))
        doc = desktop.loadComponentFromURL(
            file_url,
            "_blank",
            0,
            tuple()
        )
        
        if not doc:
            print(f"Error: Could not open {input_file}", file=sys.stderr)
            return False
        
        # Get the presentation pages
        pages = doc.getDrawPages()
        num_slides = pages.getCount()
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Get the actual page size from the document
        # PowerPoint slides dimensions are in 1/100mm units
        page_width_mm = 0
        page_height_mm = 0
        
        try:
            # Try multiple methods to get page size
            first_page = pages.getByIndex(0)
            
            # Method 1: Get size from page
            if hasattr(first_page, 'getSize'):
                try:
                    size = first_page.getSize()
                    page_width_mm = size.Width  # in 1/100mm
                    page_height_mm = size.Height  # in 1/100mm
                    print(f"PPT Export: Detected slide size from page: {page_width_mm}x{page_height_mm} (1/100mm)", file=sys.stderr)
                except:
                    pass
            
            # Method 2: Get size from document page settings
            if (page_width_mm == 0 or page_height_mm == 0) and hasattr(doc, 'getPageSize'):
                try:
                    page_size = doc.getPageSize()
                    page_width_mm = page_size.Width
                    page_height_mm = page_size.Height
                    print(f"PPT Export: Detected slide size from document: {page_width_mm}x{page_height_mm} (1/100mm)", file=sys.stderr)
                except:
                    pass
                    
        except Exception as e:
            print(f"Warning: Could not get page size: {e}", file=sys.stderr)
        
        # If we couldn't get dimensions, use standard PowerPoint dimensions
        # Standard is 25400 x 19050 (1/100mm) = 10" x 7.5" (4:3)
        # But many modern presentations use 25400 x 14287.5 (1/100mm) = 10" x 5.625" (16:9)
        if page_width_mm == 0 or page_height_mm == 0:
            # Try to detect from the actual presentation - check if it's 16:9 or 4:3
            # For now, default to 4:3, but we'll let the export use native size
            page_width_mm = 25400  # 10 inches
            page_height_mm = 19050  # 7.5 inches (4:3 aspect ratio)
            print(f"PPT Export: Using default dimensions: {page_width_mm}x{page_height_mm} (1/100mm)", file=sys.stderr)
        
        # Export to PDF first, then convert PDF pages to images
        # This approach preserves layout better and matches PowerPoint rendering more closely
        temp_pdf_path = os.path.join(output_dir, "temp_export.pdf")
        temp_pdf_url = uno.systemPathToFileUrl(os.path.abspath(temp_pdf_path))
        
        print(f"PPT Export: Exporting to PDF first: {temp_pdf_path}", file=sys.stderr)
        
        try:
            # Export entire presentation to PDF
            # PDF export preserves layout and text positioning better than direct PNG export
            pdf_filter_data = (
                PropertyValue("URL", 0, temp_pdf_url, 0),
                PropertyValue("FilterName", 0, "impress_pdf_Export", 0),
            )
            
            # Use the document's storeToURL method to export to PDF
            if hasattr(doc, 'storeToURL'):
                doc.storeToURL(temp_pdf_url, pdf_filter_data)
                print(f"PPT Export: Successfully exported to PDF", file=sys.stderr)
            else:
                raise Exception("Document does not support storeToURL method")
            
            # Close the document before converting PDF
            doc.close(True)
            
            # Now convert PDF pages to PNG images using pdftoppm (poppler-utils)
            # This preserves the exact layout from PDF
            print(f"PPT Export: Converting PDF pages to PNG images...", file=sys.stderr)
            
            # Check if pdftoppm is available
            try:
                subprocess.run(['pdftoppm', '-v'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
            except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                # pdftoppm not available, try using pdf2image Python library
                try:
                    from pdf2image import convert_from_path
                    print(f"PPT Export: Using pdf2image library to convert PDF", file=sys.stderr)
                    
                    # Convert PDF to images at 150 DPI (good quality, reasonable size)
                    images = convert_from_path(temp_pdf_path, dpi=150)
                    
                    for i, image in enumerate(images):
                        output_file = os.path.join(output_dir, f"slide-{i + 1}.png")
                        image.save(output_file, 'PNG')
                        print(f"PPT Export: Converted page {i+1} to PNG", file=sys.stderr)
                    
                except ImportError:
                    # Fallback: Use LibreOffice to convert PDF pages to PNG
                    print(f"PPT Export: pdf2image not available, using LibreOffice to convert PDF", file=sys.stderr)
                    pdf_doc = desktop.loadComponentFromURL(
                        temp_pdf_url,
                        "_blank",
                        0,
                        tuple()
                    )
                    
                    if pdf_doc:
                        pdf_pages = pdf_doc.getDrawPages()
                        for i in range(pdf_pages.getCount()):
                            page = pdf_pages.getByIndex(i)
                            output_file = os.path.join(output_dir, f"slide-{i + 1}.png")
                            output_url = uno.systemPathToFileUrl(os.path.abspath(output_file))
                            
                            filter_factory = context.ServiceManager.createInstanceWithContext(
                                "com.sun.star.drawing.GraphicExportFilter", context
                            )
                            
                            if hasattr(filter_factory, 'setSourceDocument'):
                                filter_factory.setSourceDocument(page)
                            
                            filter_data = (
                                PropertyValue("URL", 0, output_url, 0),
                                PropertyValue("FilterName", 0, "PNG", 0),
                            )
                            
                            if hasattr(filter_factory, 'filter'):
                                filter_factory.filter(filter_data)
                                print(f"PPT Export: Converted PDF page {i+1} to PNG", file=sys.stderr)
                        
                        pdf_doc.close(True)
                    else:
                        raise Exception("Could not open PDF for conversion")
            else:
                # Use pdftoppm (poppler-utils) - best quality and fastest
                print(f"PPT Export: Using pdftoppm to convert PDF pages", file=sys.stderr)
                pdftoppm_cmd = [
                    'pdftoppm',
                    '-png',
                    '-r', '150',  # 150 DPI resolution
                    temp_pdf_path,
                    os.path.join(output_dir, 'slide')
                ]
                
                subprocess.run(pdftoppm_cmd, check=True, timeout=120)
                
                # Rename files to slide-1.png, slide-2.png, etc.
                import glob
                png_files = sorted(glob.glob(os.path.join(output_dir, 'slide-*.png')))
                for i, old_path in enumerate(png_files, 1):
                    new_path = os.path.join(output_dir, f'slide-{i}.png')
                    if old_path != new_path:
                        os.rename(old_path, new_path)
                        print(f"PPT Export: Renamed {os.path.basename(old_path)} to slide-{i}.png", file=sys.stderr)
            
            # Clean up temporary PDF
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
                print(f"PPT Export: Removed temporary PDF file", file=sys.stderr)
                
        except Exception as e:
            print(f"Error: PDF export/conversion failed: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            
            # Fallback: Close document and try direct PNG export
            try:
                doc.close(True)
            except:
                pass
            raise
        
        # Document already closed after PDF export
        # Clean up LibreOffice process
        try:
            lo_process.terminate()
            lo_process.wait(timeout=5)
        except:
            lo_process.kill()
        
        # Verify files were created
        created_files = sorted([f for f in os.listdir(output_dir) if f.endswith('.png') and f.startswith('slide-')])
        
        if len(created_files) > 0:
            print(f"Successfully exported {len(created_files)} slides", file=sys.stderr)
            return True
        else:
            print("Error: No slide images were created", file=sys.stderr)
            return False
        
    except ImportError as e:
        print(f"Error: Python UNO module not available: {e}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 export-pptx-slides.py <input_pptx> <output_dir>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}", file=sys.stderr)
        sys.exit(1)
    
    success = export_slides(input_file, output_dir)
    sys.exit(0 if success else 1)
