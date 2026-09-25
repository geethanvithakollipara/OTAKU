"""Model-free tests (no downloads): python -m unittest test_ocr_logic -v"""
import unittest
import numpy as np
import otaku_ocr as o


class FakeReader:
    # two vertical columns of one bubble, plus a far-away second bubble
    def detect(self, image, **kw):
        return ([[[100, 130, 50, 200], [140, 170, 50, 210], [600, 640, 400, 500]]], [[]])


class FakeMocr:
    def __init__(self): self.calls = 0
    def __call__(self, img):
        self.calls += 1
        return f"text{self.calls}"


class T(unittest.TestCase):
    def test_merge_groups_bubbles_and_orders_rtl(self):
        boxes = [(100, 50, 130, 200), (140, 50, 170, 210), (600, 400, 640, 500)]
        regions = o.merge_boxes(boxes, (1000, 1000))
        self.assertEqual(len(regions), 2)
        self.assertLess(regions[0][1], regions[1][1])          # top bubble first

    def test_mangaocr_pipeline(self):
        eng = object.__new__(o.MangaOCR)
        eng.backend, eng._reader, eng._mocr = "mangaocr", FakeReader(), FakeMocr()
        blocks = eng._read_with_mangaocr(np.full((1000, 1000, 3), 255, np.uint8))
        self.assertEqual([b.text for b in blocks], ["text1", "text2"])
        self.assertIsNone(blocks[0].confidence)

    def test_safe_path(self):
        p = o._safe_upload_path("/tmp/x", "../../etc/passwd")
        self.assertTrue(p.startswith("/tmp/x/") and ".." not in p)


if __name__ == "__main__":
    unittest.main()
