const demoService = require('../service/demo.service');

module.exports = {
  getDemo: async (req, res) => {
    try {
      const result = await demoService.getDemo();
      if (!result.ok) {
        res.status(400).json({ message: result.message });
        return;
      }
      res.status(200).json(result.data);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
      return;
    }
  },
};
