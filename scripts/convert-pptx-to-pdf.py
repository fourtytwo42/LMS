#!/usr/bin/env python3
"""
Convert PPTX file to PDF using LibreOffice UNO API with better layout preservation.
Usage: python3 convert-pptx-to-pdf.py <input_pptx> <output_pdf>
"""
import sys
import os
import subprocess
import time

def convert_pptx_to_pdf(input_file, output_file):
    """Convert PPTX to PDF using LibreOffice UNO API with layout preservation."""
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
        
        # Disable autofit completely - it causes font rendering issues and makes text too thin
        # Accept that there may be minor vertical overflow, but text will be readable
        # The weird "s" characters are caused by font substitution when original fonts aren't installed
        # This is a limitation of LibreOffice conversion that can't be fully resolved
        print("PPT to PDF: Converting without autofit to preserve text quality...", file=sys.stderr)
        
        # Export to PDF with specific options to preserve layout
        output_url = uno.systemPathToFileUrl(os.path.abspath(output_file))
        
        # PDF export filter properties
        # These options help preserve the exact layout
        filter_data = (
            PropertyValue("URL", 0, output_url, 0),
            PropertyValue("FilterName", 0, "impress_pdf_Export", 0),
            # Try to preserve exact layout
            PropertyValue("SelectPdfVersion", 0, 1, 0),  # PDF 1.4
            PropertyValue("UseTaggedPDF", 0, False, 0),
            PropertyValue("ExportFormFields", 0, False, 0),
            PropertyValue("Quality", 0, 100, 0),
            # Try to preserve slide dimensions exactly
            PropertyValue("ReduceImageResolution", 0, False, 0),
        )
        
        # Export to PDF
        doc.storeToURL(output_url, filter_data)
        doc.close(True)
        
        # Clean up LibreOffice process
        try:
            lo_process.terminate()
            lo_process.wait(timeout=5)
        except:
            lo_process.kill()
        
        # Verify PDF was created
        if os.path.exists(output_file):
            print(f"Successfully converted {input_file} to {output_file}", file=sys.stderr)
            return True
        else:
            print(f"Error: PDF file was not created at {output_file}", file=sys.stderr)
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
        print("Usage: python3 convert-pptx-to-pdf.py <input_pptx> <output_pdf>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}", file=sys.stderr)
        sys.exit(1)
    
    success = convert_pptx_to_pdf(input_file, output_file)
    sys.exit(0 if success else 1)

