export function updatePaitingImageSVG() {
        if ($("#svgContainer svg").length > 0) {
            $('#btnSaveImage').html('Saving...');
            $('#btnSaveImage').attr('disabled',true);
            $('#btnCancelImage').attr('disabled',true);
            const svgEl = $("#svgContainer svg").get(0);
            svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            const svgData = svgEl.outerHTML;
            const preface = '<?xml version="1.0" standalone="no"?>\r\n';
            const svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
            var formData = new FormData();
            formData.append('file', svgBlob); // myFile is the input type="file" control
            formData.append('ImageID', ImageID); // myFile is the input type="file" control
            var _url = '/Image/UpdatePaitingImage';
            $.ajax({
                url: _url,
                type: 'POST',
                data: formData,
                processData: false,  // tell jQuery not to process the data
                contentType: false,  // tell jQuery not to set contentType
                success: function () {
                    $('#btnSaveImage').hide();
                    $('#btnProcess').hide();
                    $('#btnCancelImage').hide();
                    $('#btnPaintImage').show();
                    alert('The image was successfully saved!');
                },
                error: function (result) {
                    $('#btnSaveImage').html('Save Imagen');
                    $('#btnSaveImage').attr('disabled', false);
                    $('#btnCancelImage').attr('disabled', false);
                    alert(result.responseJSON);
                }
            });
        }
    }
   